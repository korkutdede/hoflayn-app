import {
  EXPENSE_CATEGORIES,
  buildExpenseProfitInput,
  calculateProfit,
  entryAmountMinorFromProfitScenario,
  expenseCategoryKey,
  expenseMetaFromProfitInputs,
  formatMinor,
  summarizeExpenseLedger,
  type ExpenseCategoryId,
} from '@hoflayn/calc';
import type { ToolScenarioDto } from '@hoflayn/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AppTitle,
  Card,
  Field,
  Message,
  PrimaryButton,
  TextButton,
  Screen,
} from '@/src/components/ui';
import { apiRequest } from '@/src/lib/api';
import { deviceTranslator } from '@/src/lib/i18n';
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

function formatTry(minor: number) {
  return `${formatMinor(minor).replace('.', ',')} ₺`;
}

function formatDay(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isExpenseScenario(row: ToolScenarioDto) {
  return expenseMetaFromProfitInputs(row.inputs) != null;
}

type DemoExpense = ToolScenarioDto;

export default function ToolsProfitScreen() {
  const { isDemo } = useAuth();
  const t = useMemo(() => deviceTranslator(), []);
  const [category, setCategory] = useState<ExpenseCategoryId>('materials');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [scenarios, setScenarios] = useState<ToolScenarioDto[]>([]);
  const [demoRows, setDemoRows] = useState<DemoExpense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = isDemo ? demoRows : scenarios;

  const summary = useMemo(() => {
    return summarizeExpenseLedger(
      rows.map((row) => ({
        amountMinor: entryAmountMinorFromProfitScenario(row),
        at:
          expenseMetaFromProfitInputs(row.inputs)?.occurredAt ??
          row.createdAt,
      })),
    );
  }, [rows]);

  const load = useCallback(async () => {
    if (isDemo) return;
    try {
      const scenarioRows = await apiRequest<ToolScenarioDto[]>(
        '/api/v1/tools/scenarios?kind=profit',
      );
      setScenarios(scenarioRows.filter(isExpenseScenario));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Veriler alınamadı.');
    }
  }, [isDemo]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function addExpense() {
    setError(null);
    setSuccess(null);
    let payload;
    try {
      payload = buildExpenseProfitInput({
        category,
        amount,
        note,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Tutar geçersiz.');
      return;
    }

    const label =
      payload.ledger.note || t(expenseCategoryKey(payload.ledger.category));

    if (isDemo) {
      const result = calculateProfit(payload);
      const now = new Date().toISOString();
      setDemoRows((prev) => [
        {
          id: `demo-${Date.now()}`,
          productId: null,
          kind: 'profit',
          name: label,
          currency: 'TRY',
          inputs: payload as unknown as Record<string, unknown>,
          results: result as unknown as Record<string, unknown>,
          createdAt: now,
          updatedAt: now,
        },
        ...prev,
      ]);
      setAmount('');
      setNote('');
      setSuccess('Gider eklendi (demo — kayıt tutulmaz).');
      return;
    }

    setBusy(true);
    try {
      await apiRequest('/api/v1/tools/scenarios', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'profit',
          name: label,
          productId: null,
          inputs: payload,
        }),
      });
      setAmount('');
      setNote('');
      setSuccess('Gider deftere yazıldı.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kayıt başarısız.');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(row: ToolScenarioDto) {
    Alert.alert('Gideri sil', `${row.name} silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => void removeExpense(row),
      },
    ]);
  }

  async function removeExpense(row: ToolScenarioDto) {
    if (isDemo) {
      setDemoRows((prev) => prev.filter((item) => item.id !== row.id));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/api/v1/tools/scenarios/${row.id}`, {
        method: 'DELETE',
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Silinemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppTitle eyebrow="Maliyet">Gider defteri</AppTitle>
      <Text style={styles.help}>
        Malzeme ve atölye harcamalarını satır satır yaz. Üstte bu ay ve bugüne
        kadarki toplamın; aşağıda zaman çizelgesi.
      </Text>

      <Card>
        <View style={styles.totalsRow}>
          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>Bu ay</Text>
            <Text style={styles.totalValue}>{formatTry(summary.monthMinor)}</Text>
            <Text style={styles.totalHint}>{summary.monthCount} kayıt</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>Bugüne kadar</Text>
            <Text style={styles.totalValue}>
              {formatTry(summary.allTimeMinor)}
            </Text>
            <Text style={styles.totalHint}>{summary.count} kayıt</Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.title}>Gider ekle</Text>
        <Text style={styles.label}>Kategori</Text>
        <View style={styles.chips}>
          {EXPENSE_CATEGORIES.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.chip,
                category === item.id && styles.chipSelected,
              ]}
              onPress={() => setCategory(item.id)}>
              <Text
                style={[
                  styles.chipText,
                  category === item.id && styles.chipTextSelected,
                ]}>
                {t(expenseCategoryKey(item.id))}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Tutar (₺)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="örn. 250.00"
        />
        <Field
          label="Ne aldın? (opsiyonel)"
          value={note}
          onChangeText={setNote}
          placeholder="örn. ceviz levha, boya seti"
        />
        {error ? <Message>{error}</Message> : null}
        {success ? <Message tone="success">{success}</Message> : null}
        <PrimaryButton
          label="Deftere yaz"
          loading={busy}
          onPress={() => void addExpense()}
        />
      </Card>

      <Card>
        <Text style={styles.title}>Kayıtlar</Text>
        {!rows.length ? (
          <Text style={styles.help}>
            Henüz gider yok. İlk satırı yukarıdan ekle.
          </Text>
        ) : (
          rows.map((row) => {
            const meta = expenseMetaFromProfitInputs(row.inputs);
            const amountMinor = entryAmountMinorFromProfitScenario(row);
            const when = meta?.occurredAt ?? row.createdAt;
            const categoryLabel = meta
              ? t(expenseCategoryKey(meta.category))
              : 'Gider';
            return (
              <View key={row.id} style={styles.entry}>
                <View style={styles.entryTop}>
                  <View style={styles.entryText}>
                    <Text style={styles.entryName}>{row.name}</Text>
                    <Text style={styles.help}>
                      {categoryLabel} · {formatDay(when)}
                    </Text>
                  </View>
                  <Text style={styles.entryAmount}>
                    {formatTry(amountMinor)}
                  </Text>
                </View>
                <TextButton onPress={() => confirmDelete(row)}>Sil</TextButton>
              </View>
            );
          })
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.ink, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.softBrand,
  },
  chipText: { color: colors.ink },
  chipTextSelected: { color: colors.brand, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  help: { color: colors.muted, lineHeight: 20 },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  totalBlock: { flex: 1, gap: 4 },
  totalDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  totalLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  totalValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  totalHint: { color: colors.muted, fontSize: 13 },
  entry: {
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  entryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  entryText: { flex: 1, gap: 2 },
  entryName: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  entryAmount: { color: colors.ink, fontWeight: '800', fontSize: 16 },
});
