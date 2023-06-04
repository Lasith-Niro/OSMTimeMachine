from flask import Flask, render_template, request
from datetime import datetime
import requests

import json
app = Flask(__name__)

def fetch_way_history(way_id, start_date, end_date):
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
    response = requests.get(overpass_url, params={'data': overpass_query})
    data = response.json()
    return data

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        way_id = request.form['way_id']
        
        # Set start date as much in the past as possible
        start_date = "1970-01-01"
        
        # Set end date as today
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        way_history = fetch_way_history(way_id, start_date, end_date)
        # save way_history to a file
        # with open('way_history.json', 'w') as f:
        #     json.dump(way_history, f)

                
        # Extract the coordinates from the JSON response
        coordinates = []
        n=0
        if way_history:
            elements = way_history["elements"]
            # print(json.dumps(elements, indent=4, sort_keys=True))
            for element in elements:
                if element["type"] == "way":
                    n+=1
                    geometry = element["geometry"]
                    version = element["version"]
                    timestamp = element["timestamp"]
                    user = element["user"]
                    # if element["tags"] exists, then pass it otherwise pass an empty dict
                    tags = element.get("tags", {})
                    
                    
                    # print("Geometry:", geometry)
                    # print("Version:", version)
                    # print()
                    coordinates.append({"geometry": geometry, "version": version, "timestamp": timestamp, "user": user, "tags": tags})
            print("Number of versions:", n)
            print("-------------------")
            
        # print(coordinates)
        # Render the template with the map and way history
        return render_template('map.html', coordinates=json.dumps(coordinates), way_id=way_id)
    
    return render_template('map.html')

if __name__ == '__main__':
    app.run(debug=True)
