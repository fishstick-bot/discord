import Bot from '../client/Client';

interface IEvent {
    name: string;
    run: (bot: Bot, ...args: any[]) => Promise<void>;
}

export default IEvent;
