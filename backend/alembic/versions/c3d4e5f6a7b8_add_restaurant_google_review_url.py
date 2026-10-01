"""add_restaurant_google_review_url

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-10-01 10:00:00.000000

Solo agrega una columna opcional: restaurants.google_review_url (varchar 500, NULL).
Los restaurantes existentes quedan con NULL (sin botón de reseña en la carta).
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('restaurants') as batch:
        batch.add_column(sa.Column('google_review_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('restaurants') as batch:
        batch.drop_column('google_review_url')
