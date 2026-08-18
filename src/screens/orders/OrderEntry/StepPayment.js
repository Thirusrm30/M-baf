import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../../../theme';
import { FormInput } from '../../../components/forms';
import { Card } from '../../../components/common';

const numericFilter = (value) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 1) {
        return parts.shift() + '.' + parts.join('');
    }
    return cleaned;
};

const dateFilter = (value) => value.replace(/[^0-9/-]/g, '');

const getFutureDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const QUICK_DATES = [
    { label: '+3 Days', days: 3 },
    { label: '+7 Days', days: 7 },
    { label: '+14 Days', days: 14 },
    { label: '+30 Days', days: 30 },
];

const StepPayment = ({ form, updateForm, styles }) => {
    return (
        <View>
            <Text style={styles.stepDescription}>Enter payment details and delivery date</Text>

            <FormInput
                label="Delivery Date"
                value={form.deliveryDate}
                onChangeText={(v) => updateForm('deliveryDate', v)}
                placeholder="YYYY-MM-DD or DD-MM-YYYY"
                icon="calendar-outline"
                required
                filter={dateFilter}
            />

            {/* Quick Date Selection Chips */}
            <View style={localStyles.chipRow}>
                {QUICK_DATES.map((item) => {
                    const preset = getFutureDate(item.days);
                    const isSelected = form.deliveryDate === preset;
                    return (
                        <TouchableOpacity
                            key={item.days}
                            style={[localStyles.chip, isSelected && localStyles.chipSelected]}
                            onPress={() => updateForm('deliveryDate', preset)}
                            activeOpacity={0.7}
                        >
                            <Text style={[localStyles.chipText, isSelected && localStyles.chipTextSelected]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Card style={styles.paymentCard}>
                <View style={styles.paymentHeader}>
                    <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.paymentTitle}>Payment Details</Text>
                </View>

                <FormInput
                    label="Total Amount"
                    value={form.totalAmount}
                    onChangeText={(v) => updateForm('totalAmount', v)}
                    placeholder="₹ 0"
                    keyboardType="decimal-pad"
                    required
                    filter={numericFilter}
                />
                <FormInput
                    label="Advance Amount"
                    value={form.advanceAmount}
                    onChangeText={(v) => updateForm('advanceAmount', v)}
                    placeholder="₹ 0"
                    keyboardType="decimal-pad"
                    filter={numericFilter}
                />

                {form.totalAmount && (
                    <View style={styles.balanceSummary}>
                        <View style={styles.balanceRow}>
                            <Text style={styles.balanceLabel}>Total</Text>
                            <Text style={styles.balanceValue}>₹{parseFloat(form.totalAmount || 0).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.balanceRow}>
                            <Text style={styles.balanceLabel}>Advance</Text>
                            <Text style={[styles.balanceValue, { color: COLORS.success }]}>−₹{parseFloat(form.advanceAmount || 0).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={[styles.balanceRow, styles.balanceFinal]}>
                            <Text style={styles.balanceFinalLabel}>Balance Due</Text>
                            <Text style={styles.balanceFinalValue}>
                                ₹{((parseFloat(form.totalAmount || 0)) - (parseFloat(form.advanceAmount || 0))).toLocaleString('en-IN')}
                            </Text>
                        </View>
                    </View>
                )}
            </Card>
        </View>
    );
};

const localStyles = StyleSheet.create({
    chipRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: -6,
        marginBottom: SIZES.md,
        flexWrap: 'wrap',
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: COLORS.bgElevated,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    chipSelected: {
        backgroundColor: COLORS.primaryMuted,
        borderColor: COLORS.primary,
    },
    chipText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        ...FONTS.medium,
    },
    chipTextSelected: {
        color: COLORS.primary,
        ...FONTS.semiBold,
    },
});

export default StepPayment;
