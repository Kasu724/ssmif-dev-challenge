"""
Database connection setup using SQLAlchemy + SQLite.
"""
import os
from sqlalchemy import create_engine, Column, Integer, String, Float, Date
from sqlalchemy.orm import sessionmaker, declarative_base

BASE_DIR = os.path.dirname(os.path.abspath(__file__))       # /path/to/backend
DB_PATH = os.path.join(BASE_DIR, "..", "db", "dev.db")      # /path/to/db/dev.db
SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.abspath(DB_PATH)}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Price(Base):
    """
    Table for storing daily price data for any asset symbol.
    """
    __tablename__ = "prices"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    date = Column(Date, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Float)

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("Database and tables created.")