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
        'webClients': 0,
        'timeOfDay': 0,
        'players': []
    }
    
    def __init__(self):
        self.rcon_host = os.getenv('RCON_HOST')
        self.rcon_password = os.getenv('RCON_PASSWORD')
        self.rcon_port = os.getenv('RCON_PORT', 25575)
        self.socket_host = os.getenv('SHOCKET_HOST', '0.0.0.0')
        self.socket_port = int(os.getenv('SOCKET_PORT', 8888))
        self.log_level = os.getenv('LOG_LEVEL', 'ERROR')
        self.refresh_rate = int(os.getenv('REFRESH_RATE', 5))
        
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
        self.clients.add(ws)
        while True:
            try:
                await ws.send(json.dumps(self.current_data))
            except (websockets.exceptions.ConnectionClosedOK, 
                websockets.exceptions.ConnectionClosedError,
                websockets.exceptions.ConnectionClosed):
                    self.clients.remove(ws)
                    await ws.wait_closed()
                    self.log.info('Client connection closed')
                    break
            finally:
                await asyncio.sleep(self.refresh_rate)
    
    async def schedule_gets(self):
        while True:
            if (len(self.clients)):
                self.current_data['players'] = self.get_player_data()
                self.current_data['timeOfDay'] = self.get_day_time()
                self.current_data['webClients'] = len(self.clients)
            
            await asyncio.sleep(self.refresh_rate)
            
    def get_day_time(self):
        response = self.rcon_client.command('time query daytime')
        match = re.search(r'([0-9]+)', response)
        day_time = int(match.group(1))
        return day_time
    
    def get_player_health(self, player_name):
        response = self.rcon_client.command(f'data get entity {player_name} Health')
        match = re.search(r':.+?([0-9.]+)', response)
        player_health = float(match.group(1))
        return player_health
    
    def get_player_level(self, player_name):
        response = self.rcon_client.command(f'data get entity {player_name} XpLevel')
        match = re.search(r':.+?([0-9]+)', response)
        player_level = int(match.group(1))
        return player_level
    
    def get_player_position(self, player_name):
        response = self.rcon_client.command(f'data get entity {player_name} Pos')
        match = re.search(r'(\[.*\])', response)
        player_position = eval(match.group(1).replace('d', ''))

        response = self.rcon_client.command(f'data get entity {player_name} Dimension')
        match = re.search(r'data: (.*)', response)
        player_dimension = match.group(1).strip('"')
        
        return {
            'x': player_position[0], 
            'y': player_position[1], 
            'z': player_position[2],
            'dimension': player_dimension            
        }
        
    def get_player_food_level(self, player_name):
        response = self.rcon_client.command(f'data get entity {player_name} foodLevel')
        match = re.search(r'data: ([0-9]+)', response)
        player_food_level = float(match.group(1).strip())
        
        return player_food_level
    
    def get_player_air(self, player_name):
        response = self.rcon_client.command(f'data get entity {player_name} Air')
        match = re.search(r'data: ([0-9]+)', response)
        player_air = int(match.group(1).strip())
        
        return player_air
    
    def get_player_data(self):
        players = []
        response = self.rcon_client.command('list')
        match = re.search(r'([0-9]+).+:(.+)', response)
        number_of_players = int(match.group(1))

        if number_of_players:
            player_list = match.group(2).strip().split(', ')
            for player_name in player_list:
                try:
                    player = {
                        'name': player_name,
                        'position': self.get_player_position(player_name),
                        'health': self.get_player_health(player_name),
                        'level': self.get_player_level(player_name),
                        'food': self.get_player_food_level(player_name),
                        'air': self.get_player_air(player_name)
                    }

                    players.append(player)
                except (AttributeError):
                    self.log.warning(f'There was a problem getting data for {player_name}. Have they gone offline during data fetching?')

        return players
    
SocketServer().start()
