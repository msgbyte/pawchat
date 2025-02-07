import { TcService, TcDbService } from 'tailchat-server-sdk';
import type { ExcalidrawDocument, ExcalidrawModel } from '../models/excalidraw';

/**
 * Excalidraw
 *
 * Add excalidraw support in Tailchat
 */
interface ExcalidrawService
  extends TcService,
    TcDbService<ExcalidrawDocument, ExcalidrawModel> {}
class ExcalidrawService extends TcService {
  get serviceName() {
    return 'plugin:com.msgbyte.excalidraw';
  }

  onInit() {
    this.registerLocalDb(require('../models/excalidraw').default);
  }
}

export default ExcalidrawService;
