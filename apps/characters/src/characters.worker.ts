import { BullWorker, BullWorkerProcess } from '@anchan828/nest-bullmq';
import { MediaInterface, MountsInterface, PetsInterface, queueCharacters } from '@app/core';
import { Logger } from '@nestjs/common';
import BlizzAPI, { BattleNetOptions } from 'blizzapi';
import { InjectModel } from '@nestjs/mongoose';
import { Realm } from '@app/mongo';
import { Model } from "mongoose";
import { Job } from 'bullmq';
import { hash64 } from 'farmhash';

@BullWorker({ queueName: queueCharacters.name })
export class CharactersWorker {
  private readonly logger = new Logger(
    CharactersWorker.name, true,
  );

  private BNet: BlizzAPI

  constructor(
    @InjectModel(Realm.name)
    private readonly RealmModel: Model<Realm>,
  ) {}

  @BullWorkerProcess()
  public async process(job: Job): Promise<void> {
    try {
      // FIXME
      await job.updateProgress(10);

      const args: BattleNetOptions & { _id: string } = { ...job.data };

      this.BNet = new BlizzAPI({
        region: 'eu',
        clientId: args._id,
        clientSecret: args.clientSecret,
        accessToken: args.accessToken
      })

      const [name_slug, realm_slug] = args._id.split('@');

      await this.pets(name_slug, realm_slug, this.BNet)
    } catch (e) {
      this.logger.error(`${CharactersWorker.name}: ${e}`)
    }
  }

  private async media(name_slug: string, realm_slug: string, BNet: BlizzAPI): Promise<Partial<MediaInterface>> {
    const media: Partial<MediaInterface> = {};
    try {
      const response: Record<string, any> = await BNet.query(`/profile/wow/character/${realm_slug}/${name_slug}/character-media`, {
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' }
      })
      if (!response || !response.assets) return media

      if (response.character && response.character.id) media.id = response.character.id

      const assets: { key: string, value: string }[] = response.assets;
      await Promise.all(assets.map(({key, value}) => {
        media[key] = value
      }))
      return media
    } catch (e) {
      this.logger.error(`media:${e}`)
    }
  }

  private async mounts(name_slug: string, realm_slug: string, BNet: BlizzAPI): Promise<Partial<MountsInterface>> {
    const mounts_collection: Partial<MountsInterface> = {};
    try {
      const response: Record<string, any> = await BNet.query(`/profile/wow/character/${realm_slug}/${name_slug}/collections/mounts`, {
        params: { locale: 'en_GB' },
        headers: { 'Battlenet-Namespace': 'profile-eu' }
      })
      if (!response || !response.mounts || !response.mounts.length) return mounts_collection
      const { mounts } = response;
      mounts_collection.mounts = []
      await Promise.all(mounts.map((m: { mount: { id: number; name: string; }; }) => {
        if ('mount' in m) {
          mounts_collection.mounts.push({
            _id: m.mount.id,
            name: m.mount.name
          })
        }
      }))
      return mounts_collection
    } catch (e) {
      this.logger.error(`mounts: ${name_slug}@${realm_slug}:${e}`)
      return mounts_collection
    }
  }

  private async pets(name_slug: string, realm_slug: string, BNet: BlizzAPI): Promise<Partial<PetsInterface>> {
    const pets_collection: Partial<PetsInterface> = {};
    try {
      const
        hash_b: string[] = [],
        hash_a: string[] = [],
        response: Record<string, any> = await BNet.query(`/profile/wow/character/${realm_slug}/${name_slug}/collections/pets`, {
          params: { locale: 'en_GB' },
          headers: { 'Battlenet-Namespace': 'profile-eu' }
        });
      if (!response || !response.pets || !response.pets.length) return pets_collection
      const { pets } = response;
      pets_collection.pets = [];
      await Promise.all(pets.map((pet: { id: number; species: { name: string; }; name: string; is_active: boolean; level: { toString: () => string; }; }) => {
        pets_collection.pets.push({
          _id: pet.id,
          name: pet.species.name,
        })
        if ('is_active' in pet) {
          if ('name' in pet) hash_a.push(pet.name);
          hash_a.push(pet.species.name, pet.level.toString());
        }
        if ('name' in pet) hash_b.push(pet.name);
        hash_b.push(pet.species.name, pet.level.toString());
      }))
      if (hash_b.length) pets_collection.hash_b = BigInt(hash64(hash_b.toString())).toString(16);
      if (hash_a.length) pets_collection.hash_a = BigInt(hash64(hash_a.toString())).toString(16);
      return pets_collection
    } catch (error) {
      this.logger.error(`pets: ${name_slug}@${realm_slug}:${error}`)
      return pets_collection
    }
  }
}

