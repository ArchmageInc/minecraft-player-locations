# Minecraft-Player-Locations

A way to display current player locations in Minecraft on a rendered Overviewer map.

This uses a simple node web socket server running in a docker container to connect to Minecraft's RCON interface and get player location data sent to a browser.

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

The `client.js` file is what will connect the web browser to the Node socket server and render the player locations.
If the socket server will be located on a host other than what is serving the Overviewer map, or not served on port 8888,
line 2 of the `client.js` file must be modified to fit your needs.

```javascript
socketUrl: 'ws://yourdomain.com:8888'
```

### Overviewer

This assumes you have a rendered [Overviewer](https://overviewer.org/) map being served that you want to add player locations to.
In order to add this functionality additional web assets need to be included in the render.
These assets are the `client.js` and `index.html` files in this project.
Place these files in a folder on the machine which renders the map.

The JavaScript file is entirely required,and the HTML file is really just taking what Overviewer has and adding an additional script to load.

```html
<script type="text/javascript" src="client.js"></script>
```

I do not see anything in the Overviwer documentation which just adds JavaScript imports.
If you have modified your `index.html` file already, just add the aforementioned script tag.

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
  --detach \
  --publish 8888:8888 \
  --name minecraft-player-locations \
  --env "NODE_ENV=production" \
  --env "RCON_HOST=MyMineCraftHost" \
  --env "RCON_PORT=25575" \
  --env "RCON_PASSWORD=supersecretpassword" \
  archmageinc/minecraft-player-locations
```

#### Configuration

**--publish 8888:8888** - This is what maps the container port to the host port. If you need a different port bound to the local machine, change the right hand port number

**--env "RCON_HOST=MyMineCraftHost"** - This is the hostname of the Minecraft server

**--env "RCON_PORT=25575"** - This is the port RCON is listening to as defined in Minecraft's server.properties file

**--env "RCON_PASSWORD=supersecretpassword"** - This is the password to connect to RCON as defined in Minecraft's server.properties file
