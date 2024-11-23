/ Plugin für Windy mit geografischer Filterung für CGN/EDDK
windyPluginInit({
    onOpen: () => {
        console.log("Plugin gestartet");

        const username = "JulioA320";
        const password = "qwertzuiopü+";

        // CGN/EDDK Koordinaten (Bounding Box)
        const cgnLat = 50.8659;
        const cgnLon = 7.1427;
        const range = 1.0; // 1° Bereich

        // Funktion zum Abrufen von Flugzeugdaten
        async function fetchFlightData() {
            const response = await fetch('https://opensky-network.org/api/states/all', {
                headers: {
                    Authorization: 'Basic ' + btoa(username + ':' + password),
                },
            });

            if (!response.ok) {
                console.error("Fehler beim Abrufen der Daten:", response.statusText);
                return [];
            }

            const data = await response.json();
            return data.states || [];
        }

        // Funktion zum Filtern der Daten basierend auf Position
        function filterFlightsNearCGN(states) {
            return states.filter(state => {
                const [icao24, callsign, , , , lat, lon] = state;

                // Flugzeuge mit gültiger Position filtern
                if (!lat || !lon) return false;

                // Überprüfen, ob das Flugzeug in der Nähe von CGN ist
                return (
                    lat >= cgnLat - range &&
                    lat <= cgnLat + range &&
                    lon >= cgnLon - range &&
                    lon <= cgnLon + range
                );
            });
        }

        // Flugzeuge als Marker anzeigen
        let markersLayer = L.layerGroup().addTo(Windy.map);

        async function updateFlights() {
            const allFlights = await fetchFlightData();
            const filteredFlights = filterFlightsNearCGN(allFlights);

            // Alte Marker entfernen
            markersLayer.clearLayers();

            // Neue Marker hinzufügen
            filteredFlights.forEach(state => {
                const [icao24, callsign, , , , lat, lon] = state;
                if (lat && lon) {
                    L.marker([lat, lon])
                     .addTo(markersLayer)
                     .bindPopup(`Flugnummer: ${callsign || "N/A"}<br>Position: ${lat.toFixed(2)}, ${lon.toFixed(2)}`);
                }
            });

            console.log(`Aktualisierte Flüge: ${filteredFlights.length}`);
        }

        // Daten alle 10 Sekunden aktualisieren
        const updateInterval = setInterval(updateFlights, 10000);

        // Beim Schließen des Plugins die Intervalle bereinigen
        this.onClose = () => {
            clearInterval(updateInterval);
            markersLayer.clearLayers();
            console.log("Plugin geschlossen");
        };

        // Initiales Laden der Flüge
        updateFlights();
    },
    onClose: () => {
        console.log("Plugin geschlossen");
    }
});
