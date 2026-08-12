// the six route handlers: validate -> mutate -> append history -> save -> respond
import { Router, Request, Response, NextFunction } from 'express';
import { validateStep, ValidationError } from './validators';
import { state, save } from './store';

const router = Router();

router.get('/count', function (req: Request, res: Response) {
  res.send({ count: state.count });
});

router.post('/inc', function (req: Request, res: Response, next: NextFunction) {
  try {
    const by = validateStep(req.body.by);
    state.count = state.count + by;
    state.history.push({ t: new Date().getTime(), op: 'inc', val: state.count });
    save();
    res.send({ count: state.count });
  } catch (e) {
    next(e);
  }
});

router.post('/dec', function (req: Request, res: Response, next: NextFunction) {
  try {
    const by = validateStep(req.body.by);
    state.count = state.count - by;
    state.history.push({ t: new Date().getTime(), op: 'dec', val: state.count });
    save();
    res.send({ count: state.count });
  } catch (e) {
    next(e);
  }
});

router.post('/reset', function (req: Request, res: Response, next: NextFunction) {
  try {
    const extraFields = Object.keys(req.body || {});
    if (extraFields.length > 0) {
      throw new ValidationError('UNEXPECTED_FIELD', extraFields[0], '/reset does not accept a request body', 400);
    }
    state.count = 0;
    state.history.push({ t: new Date().getTime(), op: 'reset', val: 0 });
    save();
    res.send({ count: state.count });
  } catch (e) {
    next(e);
  }
});

router.get('/history', function (req: Request, res: Response) {
  res.send(state.history);
});

router.get('/healthz', function (req: Request, res: Response) {
  res.status(200).send({ status: 'ok' });
});

export default router;
