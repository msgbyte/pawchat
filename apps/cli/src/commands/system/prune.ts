import { CommandModule } from 'yargs';
import { TcBroker } from 'tailchat-server-sdk';
import defaultBrokerConfig from 'tailchat-server-sdk/dist/runner/moleculer.config';
import { config } from 'dotenv';

export const pruneCommand: CommandModule = {
  command: 'prune',
  describe: 'Remove outdate data',
  builder: undefined,
  async handler(args) {
    config();

    // TODO: search all outdate data

    // TODO: Call file service to remove them

    // const broker = new TcBroker({
    //   ...defaultBrokerConfig,
    //   transporter: process.env.TRANSPORTER,
    // });
    // await broker.start();
  },
};
