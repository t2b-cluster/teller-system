import { NotificationController } from './notification.controller';

describe('NotificationController', () => {
  let controller: NotificationController;

  beforeEach(() => {
    controller = new NotificationController();
  });

  it('should return health status', () => {
    const result = controller.health();
    expect(result).toEqual({ status: 'ok', service: 'notification-service' });
  });
});
