from mcrcon import MCRcon
import re, json, asyncio, websockets, os, signal, sys, logging

RCON_HOST = os.getenv('RCON_HOST')
RCON_PASSWORD = os.getenv('RCON_PASSWORD')
RCON_PORT = os.getenv('RCON_PORT', default=25575)
SOCKET_HOST = os.getenv('SOCKET_HOST', default='0.0.0.0')
SOCKET_PORT = int(os.getenv('SOCKET_PORT', default=8888))
LOG_LEVEL = os.getenv('LOG_LEVEL', default='ERROR')
REFRESH_RATE = int(os.getenv('REFRESH_RATE', default=5))

logging.basicConfig(level=LOG_LEVEL)

assert RCON_HOST is not None
assert RCON_PASSWORD is not None

async def sendLocations(websocket, path):
    while True:
        output = json.dumps(getLocations())
        try:
            await websocket.send(output)
        except (websockets.exceptions.ConnectionClosedOK, websockets.exceptions.ConnectionClosedError, websockets.exceptions.ConnectionClosed):
            await websocket.wait_closed()
            logging.info("Client connection closed")
            break
        finally:
            await asyncio.sleep(REFRESH_RATE)

def getLocations():
    output = []
    response = mcr.command("/list")
    match = re.search(r"([0-9]+).+:(.+)", response)
    numberOfPlayers = int(match.group(1))

    if numberOfPlayers != 0:
        playerList = match.group(2).strip().split(", ")
        for playerName in playerList:
            response = mcr.command("/data get entity {} Pos".format(playerName))
            match = re.search(r"(\[.*\])", response)
            playerPosition = eval(match.group(1).replace("d",""))

            response = mcr.command("/data get entity {} Dimension".format(playerName))
            match = re.search(r"data: (.*)", response)
            playerDimension = match.group(1).strip("\"")

            output.append({"name": playerName, "position": {"x": playerPosition[0], "y": playerPosition[1], "z": playerPosition[2]}, "dimension": playerDimension})

    return output

def exitGracefully():
    logging.warning("Shutting down")
    sys.exit(1)

signal.signal(signal.SIGINT, exitGracefully)

server = websockets.serve(sendLocations, SOCKET_HOST, SOCKET_PORT)

logging.info("Starting socket server on {}:{}".format(SOCKET_HOST, SOCKET_PORT))

with MCRcon(RCON_HOST, RCON_PASSWORD) as mcr:
    asyncio.get_event_loop().run_until_complete(server)
    asyncio.get_event_loop().run_forever()
