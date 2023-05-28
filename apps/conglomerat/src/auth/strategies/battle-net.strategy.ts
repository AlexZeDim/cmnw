import { PassportStrategy } from '@nestjs/passport/dist';
import { Strategy } from 'passport-oauth2';
import { AuthService } from '../auth.service';
import { Injectable } from '@nestjs/common';
import { stringify } from 'querystring';
import { commonwealthConfig } from '@app/configuration';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';


/**
 * Review full list of available scopes here: https://develop.battle.net/documentation/guides/using-oauth
 */

@Injectable()
export class BattleNetStrategy extends PassportStrategy(Strategy, 'battlenet') {
  constructor(
    private authService: AuthService,
    private httpService: HttpService,
  ) {
    super({
      authorizationURL: `https://eu.battle.net/oauth/authorize?${ stringify({
        client_id    : commonwealthConfig.clientId,
        redirect_uri : commonwealthConfig.redirect,
        response_type: 'code',
        scope        : 'wow.profile',
      }) }`,
      // TODO probably function here, not sure
      // Authorization: 'Basic Base64',
      tokenURL: `https://${commonwealthConfig.clientId}:${commonwealthConfig.clientSecret}@eu.battle.net/oauth/token`,
      clientID: commonwealthConfig.clientId,
      clientSecret: commonwealthConfig.clientSecret,
      grant_type: 'client_credentials',
      scope: 'wow.profile',
      redirect_uri: commonwealthConfig.redirect,
      region: 'eu',
    });
  }

  async validate(
    accessToken: string,
  ): Promise<any> {
    console.log(`accessToken: ${accessToken}`);
    const { data } = await lastValueFrom(
      this.httpService.get('https://eu.battle.net/oauth/userinfo', {
        headers: { Authorization: `Bearer ${ accessToken }` },
      })
    );
    console.log(data);
  }
}
