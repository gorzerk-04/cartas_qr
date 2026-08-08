"""add_restaurant_socials_table

Revision ID: e74c0d474c0b
Revises: 08bb4dd06833
Create Date: 2026-08-05 00:02:47.432498

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e74c0d474c0b'
down_revision = '08bb4dd06833'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('restaurant_socials',
    sa.Column('restaurant_id', sa.UUID(), nullable=False),
    sa.Column('platform', sa.Enum('instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'linkedin', 'tripadvisor', 'google_maps', name='social_platform'), nullable=False),
    sa.Column('url', sa.Text(), nullable=False),
    sa.Column('display_order', sa.Integer(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('restaurant_id', 'platform', name='uq_social_restaurant_platform')
    )
    op.create_index(op.f('ix_restaurant_socials_id'), 'restaurant_socials', ['id'], unique=False)
    op.create_index(op.f('ix_restaurant_socials_restaurant_id'), 'restaurant_socials', ['restaurant_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_restaurant_socials_restaurant_id'), table_name='restaurant_socials')
    op.drop_index(op.f('ix_restaurant_socials_id'), table_name='restaurant_socials')
    op.drop_table('restaurant_socials')
    sa.Enum(name='social_platform').drop(op.get_bind(), checkfirst=True)
