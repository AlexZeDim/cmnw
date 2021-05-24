import { PassportStrategy } from '@nestjs/passport/dist';
import { Strategy } from 'passport-oauth2';
import { AuthService } from '../auth.service';
import { HttpService, Injectable } from '@nestjs/common';
import { stringify } from "querystring";
import { commonwealthConfig } from '@app/configuration';


/**
 * Review full list of available scopes here: https://develop.battle.net/documentation/guides/using-oauth
 */

@Injectable()
export class BattlenetStrategy extends PassportStrategy(Strategy, 'battlenet') {
  constructor(
    private authService: AuthService,
    private http: HttpService,
  ) {
    super({
      authorizationURL: `https://eu.battle.net/oauth/authorize?${ stringify({
        client_id    : commonwealthConfig.client_id,
        redirect_uri : commonwealthConfig.redirect_uri,
        response_type: 'code',
        scope        : 'wow.profile',
      }) }`,
      // TODO probably function here, not sure
      // Authorization: 'Basic Base64',
      tokenURL: `https://${commonwealthConfig.client_id}:${commonwealthConfig.client_secret}@eu.battle.net/oauth/token`,
      clientID: commonwealthConfig.client_id,
      clientSecret: commonwealthConfig.client_secret,
      grant_type: 'client_credentials',
      scope: 'wow.profile',
      redirect_uri: commonwealthConfig.redirect_uri,
      region: 'eu',
    });
  }

  async validate(
    accessToken: string,
  ): Promise<any> {
    console.log(`accessToken: ${accessToken}`);
    const { data } = await this.http.get('https://eu.battle.net/oauth/userinfo', {
      headers: { Authorization: `Bearer ${ accessToken }` },
    }).toPromise();
    console.log(data);
  }
}