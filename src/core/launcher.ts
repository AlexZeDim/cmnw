import pm2, { StartOptions } from "pm2";
import path from "path";

export const launcher = async (args: StartOptions) => {
  try {

    if (args.script) args.script = path.join(__dirname, args.script)

    pm2.connect((err: any) => {
      if (err) console.error(err)
      /**
       * name: args.name,
       * script: path.join(__dirname, '..', '..', 'dist/core/keys.js'),
       * max_restarts: 1,
       * exec_mode: 'fork',
       * autorestart: false,
       * cron: 1 * * * *
       */
      pm2.start(args, (err: any) => {
        if (err) console.error(err)
        pm2.disconnect()
      });
    });
  } catch (e) {
    console.error(e)
  }
}
