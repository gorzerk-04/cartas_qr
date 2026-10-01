"""add_restaurant_google_review_source

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-10-01 15:00:00.000000

Solo agrega columnas opcionales a restaurants para la herramienta de reseñas del admin:
- google_maps_url: el enlace de Google Maps que usó el admin
- google_place_ftid: el ID del lugar extraído de ese enlace
- google_review_url_override: el enlace oficial del Perfil de Empresa (opcional)
(google_review_url, el enlace generado, ya existe desde c3d4e5f6a7b8.)
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('restaurants') as batch:
        batch.add_column(sa.Column('google_maps_url', sa.Text(), nullable=True))
        batch.add_column(sa.Column('google_place_ftid', sa.String(length=100), nullable=True))
        batch.add_column(sa.Column('google_review_url_override', sa.String(length=500), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('restaurants') as batch:
        batch.drop_column('google_review_url_override')
        batch.drop_column('google_place_ftid')
        batch.drop_column('google_maps_url')
