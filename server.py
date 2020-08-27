import asyncio
import json
import logging
import os
import re
import signal
import sys
import websockets

from functools import partial
from mcrcon import MCRcon

class SocketServer:

    clients = set()
    
    current_data = {
        'players': []
    }
    
    def __init__(self):
        self.rcon_host = os.getenv('RCON_HOST')
        self.rcon_password = os.getenv('RCON_PASSWORD')
        self.rcon_port = os.getenv('RCON_PORT', 25575)
        self.socket_host = os.getenv('SHOCKET_HOST', '0.0.0.0')
        self.socket_port = int(os.getenv('SOCKET_PORT', 8888))
        self.log_level = os.getenv('LOG_LEVEL', 'ERROR')
        self.refresh_rate = os.getenv('REFRESH_RATE', 5)
        
        self.log = logging.getLogger(__name__)
        logging.basicConfig(level=self.log_level)
        
        self.rcon_client = MCRcon(self.rcon_host, self.rcon_password, self.rcon_port)
        
        signal.signal(signal.SIGINT, self.stop)

        self.log.debug('Instantiated SocketServer')
    
    def start(self):
        self.log.info(f'Starting socket server on {self.socket_host}:{self.socket_port}')
        self.rcon_client.connect()
        server = websockets.serve(self.handle_connections, self.socket_host, self.socket_port)
        
        event_loop = asyncio.get_event_loop()
        event_loop.run_until_complete(server)
        event_loop.create_task(self.schedule_gets())
        event_loop.run_forever()
    
    def stop(self):
        self.rcon_client.disconnect()
        self.log.info('Shutting down')
        sys.exit()
    
    async def handle_connections(self, ws, path):
        while True:
            try:
                await ws.send(json.dumps(self.current_data))
            except (websockets.exceptions.ConnectionClosedOK, 
                websockets.exceptions.ConnectionClosedError,
                websockets.exceptions.ConnectionClosed):
                    await ws.wait_closed()
                    self.log.info('Client connection closed')
                    break
            finally:
                await asyncio.sleep(self.refresh_rate)
    
    async def schedule_gets(self):
        while True:
            self.current_data = self.get_locations()
            await asyncio.sleep(self.refresh_rate)

    def get_locations(self):
        output = {
            'players': []
        }
        response = self.rcon_client.command('/list')
        match = re.search(r'([0-9]+).+:(.+)', response)
        number_of_players = int(match.group(1))

        if number_of_players:
            player_list = match.group(2).strip().split(', ')
            for player_name in player_list:
                response = self.rcon_client.command(f'/data get entity {player_name} Pos')
                match = re.search(r'(\[.*\])', response)
                player_position = eval(match.group(1).replace('d', ''))

                response = self.rcon_client.command(f'/data get entity {player_name} Dimension')
                match = re.search(r'data: (.*)', response)
                player_dimension = match.group(1).strip('"')

                output['players'].append({
                    'name': player_name, 
                    'position': {
                        'x': player_position[0], 
                        'y': player_position[1], 
                        'z': player_position[2]
                    },
                    'dimension': player_dimension
                })

        return output
    
SocketServer().start()