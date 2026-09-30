"""add_loyalty_tables

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-30 15:00:00.000000

Solo agrega tablas (no toca las existentes): restaurant_customers, loyalty_programs,
loyalty_redemptions y loyalty_visits, en ese orden por las claves foráneas.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('restaurant_customers',
    sa.Column('restaurant_id', sa.UUID(), nullable=False),
    sa.Column('full_name', sa.String(length=120), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=True),
    sa.Column('email', sa.String(length=255), nullable=True),
    sa.Column('notes', sa.String(length=500), nullable=True),
    sa.Column('consent_given_at', sa.DateTime(), nullable=False),
    sa.Column('consent_version', sa.Integer(), nullable=False),
    sa.Column('created_by_user_id', sa.UUID(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('restaurant_id', 'phone', name='uq_customer_restaurant_phone')
    )
    op.create_index(op.f('ix_restaurant_customers_id'), 'restaurant_customers', ['id'], unique=False)
    op.create_index(op.f('ix_restaurant_customers_restaurant_id'), 'restaurant_customers', ['restaurant_id'], unique=False)

    op.create_table('loyalty_programs',
    sa.Column('restaurant_id', sa.UUID(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('visits_required', sa.Integer(), nullable=False),
    sa.Column('reward_description', sa.String(length=200), nullable=False),
    sa.Column('reward_product_id', sa.UUID(), nullable=True),
    sa.Column('min_hours_between_visits', sa.Integer(), nullable=False),
    sa.Column('visits_expire_after_days', sa.Integer(), nullable=True),
    sa.Column('consent_text', sa.String(length=500), nullable=False),
    sa.Column('consent_version', sa.Integer(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.CheckConstraint('visits_required BETWEEN 2 AND 100', name='ck_loyalty_programs_visits_required'),
    sa.CheckConstraint('min_hours_between_visits BETWEEN 0 AND 168', name='ck_loyalty_programs_min_hours'),
    sa.CheckConstraint('visits_expire_after_days IS NULL OR visits_expire_after_days > 0', name='ck_loyalty_programs_expire_days'),
    sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['reward_product_id'], ['products.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('restaurant_id')
    )
    op.create_index(op.f('ix_loyalty_programs_id'), 'loyalty_programs', ['id'], unique=False)

    op.create_table('loyalty_redemptions',
    sa.Column('restaurant_id', sa.UUID(), nullable=False),
    sa.Column('customer_id', sa.UUID(), nullable=False),
    sa.Column('redeemed_at', sa.DateTime(), nullable=False),
    sa.Column('redeemed_by_user_id', sa.UUID(), nullable=True),
    sa.Column('visits_consumed', sa.Integer(), nullable=False),
    sa.Column('reward_description_snapshot', sa.String(length=200), nullable=False),
    sa.Column('reward_product_id_snapshot', sa.UUID(), nullable=True),
    sa.Column('voided_at', sa.DateTime(), nullable=True),
    sa.Column('voided_by_user_id', sa.UUID(), nullable=True),
    sa.Column('void_reason', sa.Text(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['customer_id'], ['restaurant_customers.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['redeemed_by_user_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['voided_by_user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_loyalty_redemptions_id'), 'loyalty_redemptions', ['id'], unique=False)
    op.create_index('ix_loyalty_redemptions_restaurant_redeemed', 'loyalty_redemptions', ['restaurant_id', 'redeemed_at'], unique=False)
    op.create_index('ix_loyalty_redemptions_customer_id', 'loyalty_redemptions', ['customer_id'], unique=False)

    op.create_table('loyalty_visits',
    sa.Column('restaurant_id', sa.UUID(), nullable=False),
    sa.Column('customer_id', sa.UUID(), nullable=False),
    sa.Column('visited_at', sa.DateTime(), nullable=False),
    sa.Column('registered_by_user_id', sa.UUID(), nullable=True),
    sa.Column('redemption_id', sa.UUID(), nullable=True),
    sa.Column('voided_at', sa.DateTime(), nullable=True),
    sa.Column('voided_by_user_id', sa.UUID(), nullable=True),
    sa.Column('void_reason', sa.Text(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['customer_id'], ['restaurant_customers.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['redemption_id'], ['loyalty_redemptions.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['registered_by_user_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['voided_by_user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_loyalty_visits_id'), 'loyalty_visits', ['id'], unique=False)
    op.create_index('ix_loyalty_visits_restaurant_customer_visited', 'loyalty_visits', ['restaurant_id', 'customer_id', 'visited_at'], unique=False)
    op.create_index('ix_loyalty_visits_restaurant_visited', 'loyalty_visits', ['restaurant_id', 'visited_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_loyalty_visits_restaurant_visited', table_name='loyalty_visits')
    op.drop_index('ix_loyalty_visits_restaurant_customer_visited', table_name='loyalty_visits')
    op.drop_index(op.f('ix_loyalty_visits_id'), table_name='loyalty_visits')
    op.drop_table('loyalty_visits')

    op.drop_index('ix_loyalty_redemptions_customer_id', table_name='loyalty_redemptions')
    op.drop_index('ix_loyalty_redemptions_restaurant_redeemed', table_name='loyalty_redemptions')
    op.drop_index(op.f('ix_loyalty_redemptions_id'), table_name='loyalty_redemptions')
    op.drop_table('loyalty_redemptions')

    op.drop_index(op.f('ix_loyalty_programs_id'), table_name='loyalty_programs')
    op.drop_table('loyalty_programs')

    op.drop_index(op.f('ix_restaurant_customers_restaurant_id'), table_name='restaurant_customers')
    op.drop_index(op.f('ix_restaurant_customers_id'), table_name='restaurant_customers')
    op.drop_table('restaurant_customers')
