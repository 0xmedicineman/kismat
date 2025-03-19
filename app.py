from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Bus stop data
BUS_STOPS = {
    'kariakoo': {'name': 'Kariakoo', 'lat': -6.8179, 'lng': 39.2707},
    'posta': {'name': 'Posta', 'lat': -6.8182, 'lng': 39.2883},
    'kimara': {'name': 'Kimara', 'lat': -6.7808, 'lng': 39.1883},
    'mbezi': {'name': 'Mbezi', 'lat': -6.7374, 'lng': 39.1736},
    'ubungo': {'name': 'Ubungo', 'lat': -6.7924, 'lng': 39.2089}
}

# Routes data
ROUTES = {
    'route1': {
        'name': 'Kariakoo - Posta',
        'stops': ['kariakoo', 'posta'],
        'fare': 'TSh 450',
        'duration': '15 mins'
    },
    'route2': {
        'name': 'Ubungo - Kimara',
        'stops': ['ubungo', 'kimara'],
        'fare': 'TSh 650',
        'duration': '25 mins'
    },
    'route3': {
        'name': 'Mbezi - Kimara',
        'stops': ['mbezi', 'kimara'],
        'fare': 'TSh 550',
        'duration': '20 mins'
    }
}

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    if path == "":
        return render_template('index.html')
    if os.path.exists(os.path.join('static', path)):
        return send_from_directory('static', path)
    return render_template('index.html')

@app.route('/api/bus-stops')
def get_bus_stops():
    return jsonify(BUS_STOPS)

@app.route('/api/routes')
def get_routes():
    return jsonify(ROUTES)

@app.route('/api/route')
def get_route():
    from_stop = request.args.get('from', '').lower()
    to_stop = request.args.get('to', '').lower()
    
    if not from_stop or not to_stop:
        return jsonify({'error': 'Both from and to stops are required'}), 400
    
    matching_routes = []
    for route_id, route in ROUTES.items():
        stops = route['stops']
        if from_stop in stops and to_stop in stops:
            from_index = stops.index(from_stop)
            to_index = stops.index(to_stop)
            if from_index < to_index:
                matching_routes.append(route)
    
    if not matching_routes:
        return jsonify({'error': 'No direct routes found'}), 404
    
    return jsonify(matching_routes)

@app.route('/api/nearby-stops')
def get_nearby_stops():
    lat = float(request.args.get('lat', 0))
    lng = float(request.args.get('lng', 0))
    
    if not lat or not lng:
        return jsonify({'error': 'Latitude and longitude are required'}), 400
    
    nearby = []
    for stop_id, stop in BUS_STOPS.items():
        dlat = abs(stop['lat'] - lat)
        dlng = abs(stop['lng'] - lng)
        if dlat < 0.02 and dlng < 0.02:  # Approximately 2km
            nearby.append({
                'id': stop_id,
                **stop
            })
    
    return jsonify(nearby)

if __name__ == '__main__':
    app.run(debug=True)

# For Vercel
app = app
