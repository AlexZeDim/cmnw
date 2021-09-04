import { PassportStrategy } from '@nestjs/passport/dist';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Strategy } from 'passport-oauth2';
import { stringify } from 'querystring';
import { discordConfig } from '@app/configuration';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor(
    private authService: AuthService,
    private http: HttpService,
  ) {
    super({
      authorizationURL: `https://discord.com/api/oauth2/authorize?${ stringify({
        client_id    : discordConfig.id,
        redirect_uri : discordConfig.callback,
        response_type: 'code',
        scope        : 'identify',
      }) }`,
      tokenURL        : 'https://discord.com/api/oauth2/token',
      scope           : 'identify',
      clientID: discordConfig.id,
      clientSecret: discordConfig.secret,
      callbackURL: discordConfig.callback,
    });
  }

  async validate(
    accessToken: string,
  ): Promise<any> {
    const { data } = await this.http.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${ accessToken }` },
    }).toPromise();

    // TODO function to check or create account
    return this.authService.findAccountByDiscordId(data.id);
  }
}

