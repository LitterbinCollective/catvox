import { ChannelTextType, User } from 'detritus-client/lib/structures';

import VoiceQueueAnnouncer from './announcer';
import NewVoice from './new';
import { VoiceFormatResponse, VoiceFormatResponseType, VoiceFormatProcessor, VoiceFormatResponseURL, VoiceFormatResponseReadable, VoiceFormatResponseFetch } from './processors';

export default class VoiceQueue {
  public readonly announcer: VoiceQueueAnnouncer;
  private formats: VoiceFormatProcessor;
  private queue: VoiceFormatResponse[] = [];
  private readonly voice: NewVoice;

  constructor(voice: NewVoice, logChannel: ChannelTextType) {
    this.voice = voice;
    this.announcer = new VoiceQueueAnnouncer(voice, logChannel);
    this.formats = new VoiceFormatProcessor(voice.application);
  }

  public async push(url: string, user?: User) {
    let result = await this.formats.fromURL(url);
    if (!result) return false;
    if (Array.isArray(result))
      result = result.map((res) => {
        res.info.submittee = user;
        return res;
      });
    else result.info.submittee = user;
    const wasEmpty = this.queue.length === 0;

    if (Array.isArray(result)) this.queue.push(...result);
    else this.queue.push(result);
    if (wasEmpty) await this.next();
    return true;
  }

  public async next() {
    if (this.voice.isPlaying) return;
    if (this.queue.length === 0) return this.announcer.reset();
    const singleResponse = this.queue.shift();
    if (!singleResponse) return this.announcer.reset();
    this.announcer.play(singleResponse.info);
    switch (singleResponse.type) {
      case VoiceFormatResponseType.URL:
        this.voice.play((singleResponse as VoiceFormatResponseURL).url);
        break;
      case VoiceFormatResponseType.READABLE:
        this.voice.play((singleResponse as VoiceFormatResponseReadable).readable);
        break;
      case VoiceFormatResponseType.FETCH:
        this.voice.play(await (singleResponse as VoiceFormatResponseFetch).fetch());
        break;
      default:
        throw new Error('Unknown VoiceFormatResponseType');
    }
    // this.voice.playStream(singleResponse.readable ? singleResponse.readable : await singleResponse.fetch());
  }
}
