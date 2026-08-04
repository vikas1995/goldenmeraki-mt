import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { Newsletter, NewsletterDocument } from './schemas/newsletter.schema';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectModel(Newsletter.name)
    private readonly newsletterModel: Model<NewsletterDocument>,
  ) {}

  async subscribe(subscribeDto: SubscribeNewsletterDto): Promise<{ message: string }> {
    const email = subscribeDto.email.toLowerCase();
    let subscriber = await this.newsletterModel.findOne({ email });

    if (subscriber) {
      if (!subscriber.isSubscribed) {
        subscriber.isSubscribed = true;
        await subscriber.save();
      }
      return { message: 'Successfully subscribed to newsletter' };
    }

    subscriber = new this.newsletterModel({ email, isSubscribed: true });
    await subscriber.save();
    return { message: 'Successfully subscribed to newsletter' };
  }

  async unsubscribe(subscribeDto: SubscribeNewsletterDto): Promise<{ message: string }> {
    const email = subscribeDto.email.toLowerCase();
    const subscriber = await this.newsletterModel.findOne({ email });
    if (subscriber) {
      subscriber.isSubscribed = false;
      await subscriber.save();
    }
    return { message: 'Successfully unsubscribed from newsletter' };
  }

  async findAllSubscribers(): Promise<NewsletterDocument[]> {
    return this.newsletterModel.find({ isSubscribed: true }).sort({ createdAt: -1 }).exec();
  }

  async remove(id: string): Promise<{ message: string }> {
    const subscriber = await this.newsletterModel.findByIdAndDelete(id);
    if (!subscriber) {
      throw new NotFoundException(`Subscriber not found`);
    }
    return { message: 'Subscriber deleted successfully' };
  }
}
