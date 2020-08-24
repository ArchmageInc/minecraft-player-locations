import asyncio
import json
import logging
import os
import re
import signal
import sys
import websockets

from mcrcon import MCRcon

RCON_HOST = os.getenv('RCON_HOST')
RCON_PASSWORD = os.getenv('RCON_PASSWORD')
RCON_PORT = os.getenv('RCON_PORT', 25575)
SOCKET_HOST = os.getenv('SOCKET_HOST', '0.0.0.0')
SOCKET_PORT = int(os.getenv('SOCKET_PORT', 8888))
LOG_LEVEL = os.getenv('LOG_LEVEL', 'ERROR')
REFRESH_RATE = int(os.getenv('REFRESH_RATE', 5))

logging.basicConfig(level=LOG_LEVEL)

assert RCON_HOST is not None
assert RCON_PASSWORD is not None


async def send_locations(websocket, path):
    while True:
        output = json.dumps(get_locations())
        try:
            await websocket.send(output)
        except (websockets.exceptions.ConnectionClosedOK, websockets.exceptions.ConnectionClosedError,
                websockets.exceptions.ConnectionClosed):
            await websocket.wait_closed()
            logging.info('Client connection closed')
            break
        finally:
            await asyncio.sleep(REFRESH_RATE)


def get_locations():
    output = []
    response = mcr.command('/list')
    match = re.search(r'([0-9]+).+:(.+)', response)
    number_of_players = int(match.group(1))

    if number_of_players:
        player_list = match.group(2).strip().split(", ")
        for player_name in player_list:
            response = mcr.command(f"/data get entity {player_name} Pos")
            match = re.search(r'(\[.*\])', response)
            player_position = eval(match.group(1).replace('d', ''))

            response = mcr.command(f'/data get entity {player_name} Dimension')
            match = re.search(r'data: (.*)', response)
            player_dimension = match.group(1).strip("\"")

            output.append({
              'name': player_name, 'position': {
                'x': player_position[0], 
                'y': player_position[1], 
                'z': player_position[2]
              },
              'dimension': player_dimension
            })

    return output


def exit_gracefully():
    logging.warning('Shutting down')
    sys.exit(1)


signal.signal(signal.SIGINT, exit_gracefully)

server = websockets.serve(send_locations, SOCKET_HOST, SOCKET_PORT)

logging.info(f"Starting socket server on {SOCKET_HOST}:{SOCKET_PORT}")

with MCRcon(RCON_HOST, RCON_PASSWORD) as mcr:
    asyncio.get_event_loop().run_until_complete(server)
    asyncio.get_event_loop().run_forever()
