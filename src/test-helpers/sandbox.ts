import * as sinon from 'sinon';
import { afterEach, beforeEach } from 'ava';

let currentSandbox: sinon.SinonSandbox;

beforeEach(() => {
  currentSandbox = sinon.createSandbox();
});

afterEach(() => {
  currentSandbox.restore();
});

export default function sandbox(): sinon.SinonSandbox {
  return currentSandbox;
}
