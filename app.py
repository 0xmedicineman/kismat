from flask import Flask, render_template, jsonify, request
from datetime import datetime

app = Flask(__name__)

# Simulated bus stop data for Dar es Salaam
BUS_STOPS = {
    'kariakoo': {'name': 'Kariakoo', 'lat': -6.8179, 'lng': 39.2707},
    'posta': {'name': 'Posta', 'lat': -6.8182, 'lng': 39.2883},
    'kimara': {'name': 'Kimara', 'lat': -6.7808, 'lng': 39.1883},
    'mbezi': {'name': 'Mbezi', 'lat': -6.7374, 'lng': 39.1736},
    'ubungo': {'name': 'Ubungo', 'lat': -6.7924, 'lng': 39.2089}
}

# Simulated bus routes
BUS_ROUTES = {
    'route1': {
        'name': 'Kimara - Kariakoo',
        'stops': ['kimara', 'ubungo', 'posta', 'kariakoo'],
        'frequency': 15  # minutes
    },
    'route2': {
        'name': 'Mbezi - Kariakoo',
        'stops': ['mbezi', 'ubungo', 'posta', 'kariakoo'],
        'frequency': 20
    }
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/route', methods=['POST'])
def find_route():
    data = request.get_json()
    from_location = data.get('from', '').lower()
    to_location = data.get('to', '').lower()
    
    # Find nearest stops to source and destination
    from_stop = find_nearest_stop(from_location)
    to_stop = find_nearest_stop(to_location)
    
    if not from_stop or not to_stop:
        return jsonify({'error': 'Location not found'}), 404
    
    # Find route between stops
    route = find_best_route(from_stop, to_stop)
    
    return jsonify(route)

def find_nearest_stop(location):
    # In a real app, this would use geocoding to find actual coordinates
    # For demo, we'll just match against known stop names
    for stop_id, stop in BUS_STOPS.items():
        if location in stop['name'].lower():
            return stop_id
    return None

def find_best_route(from_stop, to_stop):
    # Find a route that contains both stops
    for route_id, route in BUS_ROUTES.items():
        stops = route['stops']
        if from_stop in stops and to_stop in stops:
            # Get the subset of stops between source and destination
            start_idx = stops.index(from_stop)
            end_idx = stops.index(to_stop)
            if start_idx > end_idx:
                stops = list(reversed(stops))
                start_idx = stops.index(from_stop)
                end_idx = stops.index(to_stop)
            
            route_stops = stops[start_idx:end_idx + 1]
            
            # Create response with stop details and estimated times
            stops_data = []
            for idx, stop_id in enumerate(route_stops):
                stop = BUS_STOPS[stop_id].copy()
                stop['eta'] = idx * route['frequency']  # Simple ETA calculation
                stops_data.append(stop)
            
            # Create path coordinates for the route
            path = [[BUS_STOPS[stop_id]['lat'], BUS_STOPS[stop_id]['lng']] 
                   for stop_id in route_stops]
            
            return {
                'route_name': route['name'],
                'stops': stops_data,
                'path': path
            }
    
    return {'error': 'No direct route found'}

if __name__ == '__main__':
    app.run(debug=True)
