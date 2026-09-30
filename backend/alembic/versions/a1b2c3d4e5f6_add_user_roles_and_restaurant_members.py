"""add_user_roles_and_restaurant_members

Revision ID: a1b2c3d4e5f6
Revises: e74c0d474c0b
Create Date: 2026-09-30 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'e74c0d474c0b'
branch_labels = None
depends_on = None

user_role = sa.Enum('platform_admin', 'restaurant_owner', name='user_role')
member_role = sa.Enum('owner', 'staff', name='member_role')


def upgrade() -> None:
    bind = op.get_bind()
    # add_column no crea el tipo enum en Postgres; create_table (member_role) sí lo hace solo.
    user_role.create(bind, checkfirst=True)

    # Backfill: al añadirse con server_default 'platform_admin', todos los usuarios
    # existentes quedan como administradores de plataforma (mismo acceso que hoy).
    with op.batch_alter_table('users') as batch:
        batch.add_column(sa.Column('role', user_role, nullable=False, server_default='platform_admin'))
        batch.add_column(sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default=sa.false()))

    # Mínimo privilegio para los usuarios que se creen a partir de ahora.
    with op.batch_alter_table('users') as batch:
        batch.alter_column('role', existing_type=user_role, existing_nullable=False,
                           server_default='restaurant_owner')

    op.create_table('restaurant_members',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('restaurant_id', sa.UUID(), nullable=False),
    sa.Column('member_role', member_role, nullable=False, server_default='owner'),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'restaurant_id', name='uq_member_user_restaurant')
    )
    op.create_index(op.f('ix_restaurant_members_id'), 'restaurant_members', ['id'], unique=False)
    op.create_index(op.f('ix_restaurant_members_restaurant_id'), 'restaurant_members', ['restaurant_id'], unique=False)
    op.create_index(op.f('ix_restaurant_members_user_id'), 'restaurant_members', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_restaurant_members_user_id'), table_name='restaurant_members')
    op.drop_index(op.f('ix_restaurant_members_restaurant_id'), table_name='restaurant_members')
    op.drop_index(op.f('ix_restaurant_members_id'), table_name='restaurant_members')
    op.drop_table('restaurant_members')

    with op.batch_alter_table('users') as batch:
        batch.drop_column('must_change_password')
        batch.drop_column('role')

    bind = op.get_bind()
    member_role.drop(bind, checkfirst=True)
    user_role.drop(bind, checkfirst=True)
