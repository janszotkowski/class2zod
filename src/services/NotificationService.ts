import { toast } from 'react-toastify';

class NotificationService {
    public success(message: string): void {
        toast.success(message);
    };

    public error(message: string): void {
        toast.error(message);
    };

    public warning(message: string): void {
        toast.warning(message);
    };

    public info(message: string): void {
        toast.info(message);
    };
}

export const notificationService = new NotificationService();
