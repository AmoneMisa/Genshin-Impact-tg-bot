// Telegram side of buying crystals with Stars (logic: miniapp/stars.js).
import { myId } from '../../config.js';
import { withLock } from '../general/chatLock.js';
import getSession from '../getters/getSession.js';
import saveSession from '../getters/saveSession.js';
import { checkPreCheckout, mongoStarStore, reconcileStarPurchases, refundStarPurchase, settlePayment } from '../../miniapp/stars.js';

const SUPPORT_TEXT = 'По вопросам оплаты Telegram Stars (не пришли кристаллы, нужен возврат) напиши @WhitesLove и приложи скриншот платежа. '
  + 'Возврат Stars делается вручную: кристаллы за возвращённую покупку списываются.';

export async function registerStarPayments(bot, { store, now } = {}) {
  store = store || await mongoStarStore();
  const deps = {
    store,
    api: bot.api,
    withLock,
    getSession,
    saveSession,
    now,
    notify: (userId, purchase, total) => bot.sendMessage(userId,
      `Спасибо за покупку! Начислено ${total} кристаллов`
      + (purchase.bonusCrystals ? ` (включая бонус первой покупки +${purchase.bonusCrystals})` : '')
      + '. 7 дней они защищены от ограбления.'),
  };

  // Telegram waits 10 seconds for this answer, so it never throws.
  bot.on('pre_checkout_query', async query => {
    let verdict;
    try { verdict = await checkPreCheckout(query, deps); } catch (error) {
      console.error('[stars] pre_checkout failed:', error);
      verdict = { ok: false, error: 'Сейчас не получается принять платёж. Попробуй позже.' };
    }
    await bot.api.answerPreCheckoutQuery({ pre_checkout_query_id: query.id, ok: verdict.ok, ...(verdict.ok ? {} : { error_message: verdict.error }) });
  });

  bot.on('message', async message => {
    if (!message.successful_payment) return;
    try { await settlePayment(message, deps); } catch (error) {
      // The ledger already holds the paid purchase, so the next start credits it (reconcile).
      console.error('[stars] settling a payment failed:', error);
    }
  });

  // Telegram requires every bot that takes payments to answer /paysupport.
  bot.onText(/^\/paysupport(?:@\w+)?$/, message => bot.sendMessage(message.chat.id, SUPPORT_TEXT));

  bot.onText(/^\/refund_stars(?:@\w+)?\s+(\S+)/, async (message, match) => {
    if (message.from.id !== myId) return;
    try {
      const result = await refundStarPurchase(match[1], deps);
      await bot.sendMessage(message.chat.id, result.ok
        ? `Возврат выполнен: ${result.purchase.stars} Stars, списано ${result.purchase.crystals + (result.purchase.bonusCrystals || 0)} кристаллов.`
        : `Возврат не выполнен: ${result.reason}`);
    } catch (error) {
      await bot.sendMessage(message.chat.id, `Telegram отклонил возврат: ${error.message}`);
    }
  });

  const credited = await reconcileStarPurchases(deps);
  if (credited) console.log(`✅ Stars: re-credited ${credited} interrupted purchase(s)`);
  return deps;
}
