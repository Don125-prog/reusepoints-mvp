from flask import Flask, request, jsonify
from collections import Counter
from datetime import datetime

app = Flask(__name__)


def safe_parse_date(value: str):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", ""))
    except Exception:
        return None


def build_advice(transfers, token_balance, reuse_score, achievements):
    total_items = sum(int(item.get("quantity", 0)) for item in transfers)
    categories = [item.get("category", "") for item in transfers if item.get("category")]
    category_count = len(set(categories))
    category_freq = Counter(categories)

    completed_achievements = sum(1 for item in achievements if item.get("completed"))

    last_transfer_date = None
    if transfers:
        dated = [safe_parse_date(item.get("date")) for item in transfers]
        dated = [d for d in dated if d is not None]
        if dated:
            last_transfer_date = max(dated)

    days_inactive = None
    if last_transfer_date:
        days_inactive = (datetime.now() - last_transfer_date).days

    most_common_category = None
    if category_freq:
        most_common_category = category_freq.most_common(1)[0][0]

    # Правила в порядке приоритета
    if total_items == 0:
        return {
            "title": "Первый шаг",
            "text": "Начните с первой передачи вещи. Это поможет вам получить первые токены и запустить личный прогресс в системе."
        }

    if days_inactive is not None and days_inactive >= 14:
        return {
            "title": "Пора вернуться",
            "text": "Вы давно не были активны. Попробуйте передать хотя бы одну вещь на этой неделе, чтобы восстановить регулярность."
        }

    if category_count < 2:
        return {
            "title": "Расширьте участие",
            "text": "Вы уже начали пользоваться платформой. Попробуйте передавать вещи из других категорий, чтобы повысить рейтинг и открыть новые достижения."
        }

    if token_balance >= 50:
        return {
            "title": "Награда за активность",
            "text": "У вас накопилось достаточно токенов. Обменяйте их на бонусы и продолжайте участие в системе."
        }

    if reuse_score >= 70:
        return {
            "title": "Высокая активность",
            "text": "У вас высокий рейтинг ReUsePoints. Продолжайте передавать вещи регулярно, чтобы сохранять высокий уровень вовлечённости."
        }

    if total_items >= 5 and category_count >= 2:
        return {
            "title": "Хорошая динамика",
            "text": "Вы уже активно участвуете в ReUsePoints. Следующий шаг — поддерживать регулярность и расширять разнообразие передаваемых вещей."
        }

    if most_common_category:
        return {
            "title": "Персональная рекомендация",
            "text": f"Вы чаще всего передаёте вещи категории «{most_common_category}». Попробуйте добавить другие категории, чтобы увеличить разнообразие активности."
        }

    if completed_achievements == 0:
        return {
            "title": "Двигайтесь дальше",
            "text": "Сделайте ещё несколько действий в системе, чтобы открыть первое достижение и повысить свой рейтинг."
        }

    return {
        "title": "Продолжайте участие",
        "text": "Каждая переданная вещь помогает другим и повышает ваш вклад в экосистему ReUsePoints."
    }


@app.post("/advice")
def advice():
    data = request.get_json(silent=True) or {}

    transfers = data.get("transfers", [])
    token_balance = data.get("tokenBalance", 0)
    reuse_score = data.get("reuseScore", 0)
    achievements = data.get("achievements", [])

    result = build_advice(transfers, token_balance, reuse_score, achievements)
    return jsonify(result)


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)