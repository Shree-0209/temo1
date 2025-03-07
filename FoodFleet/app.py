import os
import json
from flask import Flask, render_template, jsonify, request, session
import logging
from datetime import datetime
import uuid

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Set a default session secret for development
app.secret_key = os.environ.get("SESSION_SECRET", "dev_secret_key")

# Load menu data
def load_menu_data():
    try:
        with open('data/menu.json', 'r') as f:
            menu_data = json.load(f)
            logger.debug(f"Successfully loaded menu data with {len(menu_data.get('categories', []))} categories")
            return menu_data
    except Exception as e:
        logger.error(f"Error loading menu data: {e}")
        return {"categories": []}

def generate_order_id():
    # Generate a unique order ID using timestamp and uuid
    timestamp = datetime.now().strftime("%Y%m%d%H%M")
    unique_id = str(uuid.uuid4())[:8]
    return f"ORD-{timestamp}-{unique_id}"

# Initialize orders storage
orders = []

# Valid pincodes
VALID_PINCODES = ['591143', '591153', '590018', '590006', '590008']

@app.route('/')
def index():
    logger.debug("Serving index page")
    return render_template('index.html')

@app.route('/menu')
def menu():
    logger.debug("Loading menu page")
    menu_data = load_menu_data()
    return render_template('menu.html', menu=menu_data)

@app.route('/checkout')
def checkout():
    logger.debug("Loading checkout page")
    return render_template('checkout.html')

@app.route('/my-orders')
def my_orders():
    logger.debug("Loading orders page")
    return render_template('my-orders.html', orders=orders)

@app.route('/confirmation')
def confirmation():
    logger.debug("Loading confirmation page")
    return render_template('confirmation.html')

@app.route('/api/place-order', methods=['POST'])
def place_order():
    try:
        order_data = request.json
        if not order_data:
            logger.error("No order data received")
            return jsonify({"error": "No order data provided"}), 400

        # Validate pincode
        pincode = order_data['customerInfo'].get('pincode')
        if not pincode or pincode not in VALID_PINCODES:
            logger.error(f"Invalid pincode: {pincode}")
            return jsonify({"error": "Delivery not available in this area"}), 400

        # Add timestamp and order ID
        order = {
            'id': generate_order_id(),
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'items': order_data['items'],
            'customer_info': order_data['customerInfo'],
            'total': sum(item['price'] * item['quantity'] for item in order_data['items'])
        }
        orders.append(order)
        logger.info(f"New order created: {order['id']}")
        return jsonify({"success": True, "order_id": order['id']})
    except Exception as e:
        logger.error(f"Error processing order: {e}")
        return jsonify({"error": "Failed to process order"}), 500

@app.route('/api/delete-order/<order_id>', methods=['DELETE'])
def delete_order(order_id):
    try:
        global orders
        original_length = len(orders)
        orders = [order for order in orders if order['id'] != order_id]

        if len(orders) < original_length:
            logger.info(f"Order deleted: {order_id}")
            return jsonify({"success": True})
        else:
            logger.error(f"Order not found: {order_id}")
            return jsonify({"error": "Order not found"}), 404
    except Exception as e:
        logger.error(f"Error deleting order: {e}")
        return jsonify({"error": "Failed to delete order"}), 500

if __name__ == '__main__':
    logger.info("Starting Flask application")
    app.run(host='0.0.0.0', port=5000, debug=True)