"""add project language

Revision ID: 7e3b9d4c1a56
Revises: 5a8c2f1d9e47
Create Date: 2026-10-31 03:20:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '7e3b9d4c1a56'
down_revision: Union[str, None] = '5a8c2f1d9e47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# the projects the group's own pages give with an Italian description (the seed says the same)
ITALIAN = [
    "TORINO-PIEMONTE. TECNOLOGIE E SISTEMI AMBIENTALI PER LA MOBILITA' ELETTRICA",
    "SUPERVISIONE, CONTROLLO E OTTIMIZZAZIONE DELLA PRODUZIONE DI ENERGIA RINNOVABILE",
    "SISTEMI MECCATRONICI PER L'EFFICIENZA ENERGETICA NEI BUS",
    "METODI E STRUMENTI CAD PER LA PROGETTAZIONE DELLA GERARCHIA DI MEMORIA IN SISTEMI MULTIPROCESSORE REALIZZATI SU SINGOLO CHIP",
    "TECNICHE DI PROGETTO DI SINTESI INTEGRATI SU SINGOLO CHIP PER APPLICAZIONI MULTIMEDIALI SU RETI WIRELESS",
    "ALGORITMI E ARCHITETTURE HARDWARE PER LA RIDUZIONE DEL CONSUMO ENERGETICO NEI SISTEMI EMBEDDED BASATI SULLA COMPRESSIONE DELLE INFORMAZIONI",
    "RICERCA CORRENTE 2012 (Ministero della Salute)",
    "EDIFICI A ZERO CONSUMO ENERGETICO IN DISTRETTI URBANI INTELLIGENTI",
    "SMART METRO QUADRO: GUARDANDO LA CITTA' METRO PER METRO",
    "Sviluppo Tecnologico dell'Additive Manufacturing in Piemonte"
]


def upgrade() -> None:
    op.add_column('projects', sa.Column('language', sa.String(length=5), nullable=True))
    projects = sa.table('projects', sa.column('description', sa.Text), sa.column('language', sa.String))
    op.execute(projects.update().where(projects.c.description.in_(ITALIAN)).values(language='it'))


def downgrade() -> None:
    op.drop_column('projects', 'language')
