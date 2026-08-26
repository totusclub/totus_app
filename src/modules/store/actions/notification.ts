import {del, post} from '../../axios';
import {createAsyncThunk} from '@reduxjs/toolkit';

interface INotificationTokenApi {
  provider: string;
  token: string;
  deviceId: string;
}

export const notificationToken = createAsyncThunk(
  'update-notification-settings',
  async (data: INotificationTokenApi) => {
    try {
      const response = await post('/notification-tokens', data);
      // console.log('response.data', response.data);
      return response.data;
    } catch (error: any) {
      // console.log(error.response.data);
      return error.response.data;
    }
  },
);

export const notificationTokenDelete = async (deviceId: string) => {
  try {
    const res = await del(`/notification-tokens?deviceId=${deviceId}`, {
      deviceId: deviceId,
    });
    // console.log('res.data', res);
    return res.data;
  } catch (error) {
    return error;
  }
};
