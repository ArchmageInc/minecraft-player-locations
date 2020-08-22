import asyncio
import json
import logging
import os
import signal
from dataclasses import asdict

import websockets

from mclocations.minecraft import MinecraftServer

log = logging.getLogger(__name__)


class WebSocketServer:
    def __init__(self, minecraft, socket_host, socket_port, refresh_rate):
        self.log = log
        self.minecraft = minecraft
        self.socket_host = socket_host
        self.socket_port = socket_port
        self.refresh_rate = refresh_rate
        self.ws_server = None

    async def start(self):
        self.log.info('Starting the websocket server')

        def stop_cb():
            return asyncio.create_task(self.stop())

        try:
            asyncio.get_running_loop().add_signal_handler(signal.SIGINT, stop_cb)
            asyncio.get_running_loop().add_signal_handler(signal.SIGTERM, stop_cb)
        except NotImplementedError as e:
            log.exception(f'Not implemented')

        self.ws_server = await websockets.serve(self.send_locations, self.socket_host, self.socket_port)

        await self.ws_server.wait_closed()

        self.log.info('Websocket server closed')

    async def stop(self):
        self.ws_server.close()
        self.minecraft.disconnect()

    async def send_locations(self, websocket, path):
        while True:
            players = self.minecraft.get_players()
            player_data = json.dumps([asdict(p) for p in players])
            self.log.debug(f'Sending {player_data}')
            await websocket.send(player_data)
            await asyncio.sleep(self.refresh_rate)


async def main(rcon_host, rcon_password, rcon_port, socket_host, socket_port, refresh_rate, log_level):
    logging.basicConfig(level=log_level)
    minecraft = MinecraftServer(rcon_host, rcon_password, rcon_port)
    ws = WebSocketServer(minecraft, socket_host, socket_port, refresh_rate)

    await ws.start()


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--rconhost", type=str, default=os.getenv('RCON_HOST'))
    parser.add_argument("--rconpwd", type=str, default=os.getenv('RCON_PASSWORD'))
    parser.add_argument("--rconport", type=str, default=os.getenv('RCON_PORT', 25575))
    parser.add_argument("--sockethost", type=str, default=os.getenv('SOCKET_HOST', '0.0.0.0'))
    parser.add_argument("--socketport", type=int, default=int(os.getenv('SOCKET_PORT', 8888)))
    parser.add_argument("--refreshrate", type=int, default=int(os.getenv('REFRESH_RATE', 5)))
    parser.add_argument('--verbose', '-v', action='count', default=0)

    args = parser.parse_args()

    if args.verbose > 1:
        log_level = logging.DEBUG
    elif args.verbose > 0:
        log_level = logging.INFO
    else:
        log_level = logging.WARN

    asyncio.run(main(args.rconhost, args.rconpwd, args.rconport, args.sockethost, args.socketport, args.refreshrate, log_level))
