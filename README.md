# Minecraft-Player-Locations

A way to display current player locations in Minecraft on a rendered [Overviewer](https://overviewer.org/) map.

This uses a simple python web socket server running in a docker container to connect to Minecraft's RCON interface and get player location data sent to a browser.

## Usage

### Minecraft RCON

You must have RCON enabled on your Minecraft server. To do so make sure these lines exist and have values in your server.properties file:

```
enable-rcon=true
rcon.port=25575
rcon.password=supersecretpassword
```

The docker container must be able to access the RCON port.
I do not at all recommend exposing RCON publicly.
It will be best if the docker container is on the same machine or at least on the same network.

### JavaScript Client

The `player_locations.js` file is what will connect the web browser to the Python socket server and render the player locations.
If the socket server will be located on a host other than what is serving the Overviewer map, or not served on port 8888,
line 2 of the `player_locations.js` file must be modified to fit your needs.

```javascript
socketUrl: 'ws://yourdomain.com:8888'
```

### Overviewer

This assumes you have a rendered [Overviewer](https://overviewer.org/) map being served that you want to add player locations to.
In order to add this functionality additional web assets need to be included in the render.
These assets are the JavaScript, CSS, image, and `index.html` files in this project.
Place these files in a folder on the machine which renders the map.

The JavaScript file is entirely required, the CSS file is optional, and the HTML file is really just taking what Overviewer has and adding the additional script and css to load.

```html
<script type="text/javascript" src="socket_client.js"></script>
<script type="text/javascript" src="player_list.js"></script>
<script type="text/javascript" src="player_information.js"></script>
<script type="text/javascript" src="server_information.js"></script>
<script type="text/javascript" src="player_locations.js"></script>
<link rel="stylesheet" href="player_locations.css" type="text/css" />
```

I do not see anything in the Overviwer documentation which just adds JavaScript imports.
If you have modified your `index.html` file already, just add the aforementioned script and style sheet tags.

The Overviewer configuration file should include the following line:

```
customwebassets = "/path/to/assets"
```

When Overviewer renders the map, it will copy the asset files into the defined web directory.

### Docker Socket Server

This assumes you have a machine with [Docker](https://www.docker.com/) installed and running that can communicate with the Minecraft server and has a port exposed.
The docker container runs the socket server which sends location data to the web browser as well as talks to your Minecraft server via the RCON interface.
An example docker run command looks like this:

```
docker run \
  -d \
  -p 8888:8888 \
  -e "RCON_HOST=MyMinecraftHost" \
  -e "RCON_PASSWORD=MySuperSecretPassword" \
  --name minecraft-player-locations \
  archmageinc/minecraft-player-locations:python
```

#### Configuration

The example command is the minimum needed to run the container, other environmental variables provide more configuration options:

**-p 8888:8888** - This is what maps the container port to the host port. If you need a different port bound to the local machine, change the right hand port number

**-e "RCON_HOST=MyMineCraftHost"** (Required)- This is the hostname of the Minecraft server

**-e "RCON_PASSWORD=MySuperSecretPassword"** (Required) - This is the password to connect to RCON as defined in Minecraft's server.properties file

**-e "RCON_PORT"** (Default: 25575) - This is the port RCON is listening to as defined in Minecraft's server.properties file

**-e "SOCKET_HOST"** (Default: 0.0.0.0) - This is the address on which to bind the socket server, by default binds to all available IPv4 addresses.

**-e "SOCKET_PORT"** (Default: 8888) - This is the port on which the socket server should bind. Since we're using docker, if another port is needed, the published port in the docker command could be changed.

**-e "LOG_LEVEL"** (Default: ERROR) - This is the logging level the socket server should output. (DEBUG, INFO, WARNING, ERROR)

**-e "REFRESH_RATE"** (Default: 5) - This is how often the socket server will update location data.
