import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { formatCurrency } from '../utils/currency.js';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottomColor: '#00a46d',
    borderBottomWidth: 2,
    paddingBottom: 12,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleGroup: {
    maxWidth: '65%',
  },
  brand: {
    fontSize: 24,
    fontWeight: 700,
    color: '#00a46d',
  },
  subtitle: {
    marginTop: 4,
    color: '#6b7280',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statCard: {
    width: '24%',
  },
  statLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    color: '#6b7280',
  },
  statValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 6,
  },
  description: {
    color: '#4b5563',
    lineHeight: 1.4,
  },
  table: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableHeaderCell: {
    flex: 1,
    padding: 8,
    fontSize: 9,
    fontWeight: 600,
    color: '#6b7280',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    color: '#1f2937',
  },
  footer: {
    marginTop: 24,
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'right',
  },
});

function formatMetric(value, goalType, currencyCode) {
  if (goalType === 'count') {
    return `${Number(value || 0).toLocaleString()} sales`;
  }
  return formatCurrency(value || 0, { countryCode: currencyCode, showSymbol: true });
}

export default function TaskReportDocument({ report }) {
  const { task, goalTarget, progress, progressPercent, goalType, currencyCode, participants } = report;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <Text style={styles.brand}>Ledgerly</Text>
            <Text style={styles.subtitle}>Task Performance Report</Text>
          </View>
          <View>
            <Text style={styles.subtitle}>Generated: {new Date().toLocaleDateString()}</Text>
            <Text style={styles.subtitle}>Status: {task.status === 'completed' ? 'Completed' : 'Live'}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Progress</Text>
            <Text style={styles.statValue}>{progressPercent.toFixed(1)}%</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Goal Target</Text>
            <Text style={styles.statValue}>{formatMetric(goalTarget, goalType, currencyCode)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Current Output</Text>
            <Text style={styles.statValue}>{formatMetric(progress, goalType, currencyCode)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Participants</Text>
            <Text style={styles.statValue}>{task.participants?.length ?? 0}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{task.title}</Text>
          <Text style={styles.description}>{task.description || 'No description provided.'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Participant Leaderboard</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Participant</Text>
              <Text style={styles.tableHeaderCell}>Contribution</Text>
              <Text style={styles.tableHeaderCell}>Goal</Text>
              <Text style={styles.tableHeaderCell}>Status</Text>
            </View>
            {participants.map((participant) => {
              const contribution = formatMetric(participant.progress, goalType, currencyCode);
              const goal = formatMetric(participant.goalTarget, goalType, currencyCode);
              const completed = participant.status === 'completed' || participant.progress >= participant.goalTarget;
              return (
                <View key={participant.id} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{participant.name}</Text>
                  <Text style={styles.tableCell}>{contribution}</Text>
                  <Text style={styles.tableCell}>{goal}</Text>
                  <Text style={styles.tableCell}>{completed ? 'Completed' : 'In progress'}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={styles.footer}>Generated automatically by Ledgerly • {new Date().toLocaleString()}</Text>
      </Page>
    </Document>
  );
}
