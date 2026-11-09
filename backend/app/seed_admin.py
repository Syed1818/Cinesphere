from app.core.database import sync_engine
from app.core.security import get_password_hash
from sqlalchemy import text

def ensure_admin():
    with sync_engine.connect() as conn:
        row = conn.execute(text("SELECT id FROM users WHERE email = 'admin@movierec.com'")).first()
        pw_hash = get_password_hash("admin123")
        if not row:
            conn.execute(
                text("""
                    INSERT INTO users (id, email, password_hash, username, display_name, role, is_active, email_verified, gdpr_consent_at, created_at, updated_at)
                    VALUES (gen_random_uuid(), 'admin@movierec.com', :pw, 'admin', 'System Administrator', 'ADMIN', true, true, NOW(), NOW(), NOW())
                """),
                {"pw": pw_hash}
            )
            conn.commit()
            print("Admin user created: admin@movierec.com / admin123")
        else:
            conn.execute(
                text("UPDATE users SET role = 'ADMIN', password_hash = :pw WHERE email = 'admin@movierec.com'"),
                {"pw": pw_hash}
            )
            conn.commit()
            print("Admin user updated: admin@movierec.com / admin123")

if __name__ == "__main__":
    ensure_admin()

