import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Setting, SettingDocument } from './schemas/setting.schema';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Setting.name)
    private readonly settingModel: Model<SettingDocument>,
  ) {}

  async findAll(): Promise<SettingDocument[]> {
    return this.settingModel.find().exec();
  }

  async findByKey(key: string): Promise<SettingDocument> {
    const setting = await this.settingModel.findOne({ key }).exec();
    if (!setting) {
      throw new NotFoundException(`Setting with key "${key}" not found`);
    }
    return setting;
  }

  async upsert(updateSettingDto: UpdateSettingDto): Promise<SettingDocument> {
    const { key, value, description } = updateSettingDto;
    const setting = await this.settingModel.findOneAndUpdate(
      { key },
      { $set: { value, description } },
      { new: true, upsert: true },
    );
    return setting;
  }
}
