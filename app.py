from flask import Flask, render_template, request, jsonify
from datetime import datetime
import requests
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

def validate_way_id(way_id):
    """
    Validate that way_id is a positive integer.
    Returns (is_valid, error_message)
    """
    if not way_id:
        return False, "Way ID is required"
    
    if not way_id.strip():
        return False, "Way ID cannot be empty"
    
    try:
        way_id_int = int(way_id)
        if way_id_int <= 0:
            return False, "Way ID must be a positive number"
        return True, None
    except ValueError:
        return False, "Way ID must be a valid number"

def fetch_way_history(way_id):
    """
    Fetch way history from Overpass API.
    Returns (success, data_or_error_message)
    """
    try:
        overpass_query = f"""
        [out:json];
        timeline(way,{way_id});
        foreach(
            out;
            retro(u(t["created"]))
            (
                way({way_id}); out meta geom;
                >; out meta;
            );
        );
        """
        overpass_url = "http://overpass-api.de/api/interpreter"
        
        logger.info(f"Fetching way history for way ID: {way_id}")
        
        # Add timeout to prevent hanging
        headers = {
            'User-Agent': 'OSMTimeMachine/1.0'
        }
        response = requests.get(
            overpass_url, 
            params={'data': overpass_query},
            headers=headers,
            timeout=30
        )
        
        # Check for HTTP errors
        if response.status_code != 200:
            logger.error(f"API returned status code {response.status_code}")
            return False, f"API request failed with status code {response.status_code}"
        
        # Parse JSON response
        try:
            data = response.json()
        except json.JSONDecodeError:
            logger.error("Failed to parse API response as JSON")
            return False, "Invalid response from Overpass API"
        
        # Validate response structure
        if not isinstance(data, dict):
            logger.error("API response is not a dictionary")
            return False, "Unexpected response format from API"
        
        if "elements" not in data:
            logger.error("API response missing 'elements' field")
            return False, "Invalid response structure from API"
        
        logger.info(f"Successfully fetched {len(data['elements'])} elements")
        return True, data
        
    except requests.exceptions.Timeout:
        logger.error("API request timed out")
        return False, "Request timed out. The API is taking too long to respond."
    except requests.exceptions.ConnectionError:
        logger.error("Connection error to API")
        return False, "Unable to connect to Overpass API. Please check your internet connection."
    except requests.exceptions.RequestException as e:
        logger.error(f"Request exception: {str(e)}")
        return False, f"Network error: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return False, f"An unexpected error occurred: {str(e)}"

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        way_id = request.form.get('way_id', '').strip()
        
        # Validate way_id
        is_valid, error_msg = validate_way_id(way_id)
        if not is_valid:
            logger.warning(f"Invalid way ID: {way_id} - {error_msg}")
            return render_template('map.html', error=error_msg)
        
        # Fetch way history
        success, result = fetch_way_history(way_id)
        if not success:
            # result contains error message
            return render_template('map.html', error=result, way_id=way_id)
        
        # result contains the API data
        way_history = result
        
        # Extract the coordinates from the JSON response
        coordinates = []
        way_elements = []
        
        if way_history and "elements" in way_history:
            elements = way_history["elements"]
            
            for element in elements:
                if element.get("type") == "way" and "geometry" in element:
                    way_elements.append(element)
                    
                    geometry = element["geometry"]
                    version = element.get("version", "Unknown")
                    timestamp = element.get("timestamp", "Unknown")
                    user = element.get("user", "Unknown")
                    tags = element.get("tags", {})
                    
                    coordinates.append({
                        "geometry": geometry, 
                        "version": version, 
                        "timestamp": timestamp, 
                        "user": user, 
                        "tags": tags
                    })
            
            logger.info(f"Found {len(way_elements)} way versions for way ID {way_id}")
        
        # Check if we found any way data
        if not coordinates:
            error_msg = f"No way data found for ID {way_id}. This might not be a valid way, or it might be a node or relation instead."
            logger.warning(error_msg)
            return render_template('map.html', error=error_msg, way_id=way_id)
        
        # Render the template with the map and way history
        return render_template('map.html', coordinates=json.dumps(coordinates), way_id=way_id)
    
    return render_template('map.html')

if __name__ == '__main__':
    app.run(debug=True, port=5002)
