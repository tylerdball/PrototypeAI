import os
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from database import get_conn

router = APIRouter(prefix="/campaigns/{campaign_id}/images")

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


def campaign_dir(campaign_id: int) -> str:
    path = os.path.join(UPLOAD_DIR, str(campaign_id))
    os.makedirs(path, exist_ok=True)
    return path


@router.get("")
def list_images(campaign_id: int):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM images WHERE campaign_id=? ORDER BY category, created_at DESC", (campaign_id,)
        ).fetchall()
    return [dict(r) for r in rows]


@router.post("")
async def upload_image(
    campaign_id: int,
    file: UploadFile = File(...),
    category: str = Form("general"),
    caption: str = Form(""),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")

    ext = os.path.splitext(file.filename or "img")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(campaign_dir(campaign_id), filename)

    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO images (campaign_id, filename, original_name, category, caption) VALUES (?,?,?,?,?)",
            (campaign_id, filename, file.filename, category, caption),
        )
        row = conn.execute("SELECT * FROM images WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)


@router.delete("/{image_id}")
def delete_image(campaign_id: int, image_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM images WHERE id=? AND campaign_id=?", (image_id, campaign_id)).fetchone()
        if not row:
            raise HTTPException(404, "Image not found")
        path = os.path.join(campaign_dir(campaign_id), row["filename"])
        if os.path.exists(path):
            os.remove(path)
        conn.execute("DELETE FROM images WHERE id=?", (image_id,))
    return {"ok": True}
