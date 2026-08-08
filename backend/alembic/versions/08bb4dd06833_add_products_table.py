"""add_products_table

Revision ID: 08bb4dd06833
Revises: dc2588b4f141
Create Date: 2026-08-04 23:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '08bb4dd06833'
down_revision = 'dc2588b4f141'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('products',
    sa.Column('restaurant_id', sa.UUID(), nullable=False),
    sa.Column('category_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('original_price', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('image_url', sa.Text(), nullable=True),
    sa.Column('image_cloudinary_id', sa.String(length=255), nullable=True),
    sa.Column('status', sa.Enum('available', 'unavailable', 'hidden', name='product_status'), nullable=False),
    sa.Column('tags', sa.JSON(), nullable=True),
    sa.Column('allergens', sa.JSON(), nullable=True),
    sa.Column('is_featured', sa.Boolean(), nullable=False),
    sa.Column('display_order', sa.Integer(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_products_category_id'), 'products', ['category_id'], unique=False)
    op.create_index(op.f('ix_products_id'), 'products', ['id'], unique=False)
    op.create_index(op.f('ix_products_restaurant_id'), 'products', ['restaurant_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_products_restaurant_id'), table_name='products')
    op.drop_index(op.f('ix_products_id'), table_name='products')
    op.drop_index(op.f('ix_products_category_id'), table_name='products')
    op.drop_table('products')
    sa.Enum(name='product_status').drop(op.get_bind(), checkfirst=True)
