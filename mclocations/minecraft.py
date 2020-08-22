import re

from mcrcon import MCRcon

from mclocations.models import Player, Position


class MinecraftServer:
    def __init__(self, host, password, port=25575):
        self.mcr = MCRcon(host, password, port)
        self.mcr.connect()

    def disconnect(self):
        self.mcr.disconnect()

    def get_players(self):
        players = []
        player_names = MinecraftServer._parse_list(self.mcr.command('/list'))

        for player_name in player_names:
            position = MinecraftServer._parse_position(self.mcr.command(f'/data get entity {player_name} Pos'))
            dimension = MinecraftServer._parse_dimension(self.mcr.command(f'/data get entity {player_name} Dimension'))
            players.append(Player(player_name, position, dimension))

        return players

    @classmethod
    def _parse_list(cls, message):
        """
        >>> MinecraftServer._parse_list("There are 0 of a max of 20 players online:")
        []
        >>> MinecraftServer._parse_list("There are 1 of a max of 20 players online: _DavidCoe_")
        ['_DavidCoe_']
        >>> MinecraftServer._parse_list("There are 2 of a max of 20 players online: _DavidCoe_, _NotDavidCoe_")
        ['_DavidCoe_', '_NotDavidCoe_']

        :param message:
        :return:
        """
        match = re.match(
            r'There are (?P<current_count>\d+) of a max of (?P<max_count>\d+) players online:(?: (?P<players>.+))',
            message)
        players = []

        if match:
            players = [p.strip() for p in match.group('players').split(',')]

        return players

    @classmethod
    def _parse_position(cls, message):
        """
        >>> MinecraftServer._parse_position('_DavidCoe_ has the following entity data: [-21.349449787464525d, 64.0d, 82.69999998807907d]')
        Position(x=-21.349449787464525, y=64.0, z=82.69999998807907)

        :param message:
        :return:
        """

        match = re.match(r'(?P<player_name>.+) has the following entity data: \[(?P<x>.+)d, (?P<y>.+)d, (?P<z>.+)d]',
                         message)

        return Position(float(match.group('x')), float(match.group('y')), float(match.group('z')))

    @classmethod
    def _parse_dimension(cls, message):
        """
        >>> MinecraftServer._parse_dimension('_DavidCoe_ has the following entity data: "minecraft:overworld"')
        'minecraft:overworld'

        :param message:
        :return:
        """
        return re.match(r'(?P<player_name>.+) has the following entity data: "(?P<dimension>.+)"', message).group(
            'dimension')


if __name__ == '__main__':
    import doctest

    doctest.testmod()

    import os

    RCON_HOST = os.environ['RCON_HOST']
    RCON_PASSWORD = os.environ['RCON_PASSWORD']
    RCON_PORT = os.getenv('RCON_PORT', 25575)
    minecraft = MinecraftServer(RCON_HOST, RCON_PASSWORD, RCON_PORT)
    minecraft.get_players()
