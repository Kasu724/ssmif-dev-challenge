from database import SessionLocal, Price

def verify_data():
    session = SessionLocal()
    try:
        rows = session.query(Price).limit(10).all()
        for row in rows:
            print(
                f"{row.symbol} | {row.date} | O:{row.open} H:{row.high} L:{row.low} C:{row.close} V:{row.volume}"
            )
        print(f"Retrieved {len(rows)} rows successfully.")
    finally:
        session.close()

if __name__ == "__main__":
    verify_data()