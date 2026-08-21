import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Alert, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS, getColors } from '../../theme';
import { useThemeStore } from '../../store/themeStore';
import { useOrderStore } from '../../store/orderStore';
import { StatusBadge, Card, Divider, ScreenWrapper } from '../../components/common';
import { FormButton } from '../../components/forms';
import { formatDate } from '../../services/dateUtils';

// Standard boutique measurement fields matching the reference UI
const ALL_STANDARD_MEASUREMENT_FIELDS = [
    { key: 'biceps', label: 'Biceps' },
    { key: 'length', label: 'Length' },
    { key: 'shoulder', label: 'Shoulder' },
    { key: 'frontNeckDeep', label: 'Front Neck Deep' },
    { key: 'bust', label: 'Bust' },
    { key: 'dart', label: 'Dart' },
    { key: 'hip', label: 'Hip' },
    { key: 'sleeveFit', label: 'Sleeve Fit' },
    { key: 'armhole', label: 'Armhole' },
    { key: 'sleeveLength', label: 'Sleeve Length' },
    { key: 'backNeckDeep', label: 'Back Neck Deep' },
    { key: 'upperChest', label: 'Upper Chest' },
    { key: 'frontLength', label: 'Front Length' },
];

const OrderDetailScreen = ({ route, navigation }) => {
    const isDark = useThemeStore(s => s.isDark);
    const C = getColors(isDark);
    const insets = useSafeAreaInsets();
    const { width: winWidth } = useWindowDimensions();
    const isWide = winWidth >= 768;
    const { orderId } = route.params;
    const orders = useOrderStore((s) => s.orders);
    const order = orders.find(o => o.id === orderId);

    if (!order) {
        return (
            <ScreenWrapper useSafeTop>
                <View style={[styles.header, { borderBottomColor: C.borderLight }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: C.bgCard }]}>
                        <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Order Details</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={C.error} />
                    <Text style={[styles.errorText, { color: C.textPrimary }]}>Order not found</Text>
                    <TouchableOpacity
                        style={[styles.backToListBtn, { backgroundColor: C.primary }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={[styles.backToListText, { color: C.textOnPrimary }]}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    // Stage keys matching StitchingProductionScreen
    const progressStages = [
        { key: 'pending',     label: 'Order Placed',  icon: 'time-outline' },
        { key: 'marking',     label: 'Marking',        icon: 'pencil-outline' },
        { key: 'production1', label: 'Base Stitching', icon: 'construct-outline' },
        { key: 'production2', label: 'Aari / Embr.',   icon: 'flower-outline' },
        { key: 'production3', label: 'Add-ons',        icon: 'sparkles-outline' },
        { key: 'cutting',     label: 'Cutting',        icon: 'cut-outline' },
        { key: 'stitching',   label: 'Stitching',      icon: 'checkmark-done-circle-outline' },
        { key: 'ready',       label: 'Ready',          icon: 'bag-check-outline' },
    ];

    const isDelivered = (order.status || '').toLowerCase() === 'delivered';
    const currentStageIdx = isDelivered
        ? progressStages.length
        : progressStages.findIndex(s => s.key === (order.productionStage || 'pending').toLowerCase());

    // Build the complete measurements list (standard list + any additional custom fields in the order)
    const existingMeasurements = order.measurements || {};
    const customKeys = Object.keys(existingMeasurements).filter(
        k => !ALL_STANDARD_MEASUREMENT_FIELDS.some(f => f.key === k)
    );
    const allMeasurementFields = [
        ...ALL_STANDARD_MEASUREMENT_FIELDS,
        ...customKeys.map(k => ({
            key: k,
            label: k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
        }))
    ];

    const totalAmt = order.totalAmount || 0;
    const advAmt = order.advanceAmount || 0;
    const balAmt = order.balanceAmount !== undefined ? order.balanceAmount : Math.max(0, totalAmt - advAmt);
    const paidPercent = totalAmt > 0 ? Math.min(100, Math.round((advAmt / totalAmt) * 100)) : 0;

    return (
        <ScreenWrapper useSafeTop useSafeBottom={false} style={{ flex: 1 }}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: C.borderLight }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.backBtn, { backgroundColor: C.bgCard }]}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: C.textPrimary }]}>
                    {order.orderNo || order.id}
                </Text>
                <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7}>
                    <Ionicons name="ellipsis-vertical" size={20} color={C.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Scrollable Content Container */}
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: Math.max(insets.bottom, 20) + 120 }
                ]}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                bounces={true}
                overScrollMode="always"
            >
                {/* Status Banner */}
                <View style={styles.statusBanner}>
                    <StatusBadge status={order.status} />
                    <Text style={[styles.dateLabel, { color: C.textMuted }]}>
                        Created {formatDate(order.createdAt)}
                    </Text>
                </View>

                {/* 1. Customer Details Section */}
                <Card elevated style={styles.sectionCard}>
                    <View style={styles.sectionHead}>
                        <Ionicons name="person-outline" size={18} color={C.primary} />
                        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Customer</Text>
                    </View>
                    <Text style={[styles.customerNameDetail, { color: C.textPrimary }]}>
                        {order.customerName || 'Customer'}
                    </Text>
                    <Divider />
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: C.textMuted }]}>Design</Text>
                        <Text style={[styles.infoValue, { color: C.textPrimary }]}>{order.designName || '-'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: C.textMuted }]}>Category</Text>
                        <Text style={[styles.infoValue, { color: C.textPrimary }]}>{order.category || '-'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: C.textMuted }]}>Tailor</Text>
                        <Text style={[styles.infoValue, { color: C.textPrimary, ...FONTS.semiBold }]}>
                            {order.tailorName || 'Unknown Tailor'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: C.textMuted }]}>Priority</Text>
                        <View style={[styles.priorityTag, {
                            backgroundColor: order.priority === 'high'
                                ? C.errorLight
                                : order.priority === 'medium'
                                    ? C.warningLight
                                    : C.successLight,
                        }]}>
                            <Text style={[styles.priorityText, {
                                color: order.priority === 'high'
                                    ? C.error
                                    : order.priority === 'medium'
                                        ? C.warning
                                        : C.success,
                            }]}>{order.priority || 'medium'}</Text>
                        </View>
                    </View>
                </Card>

                {/* 2. Measurements Section (Complete Responsive 2-Column Grid) */}
                <Card elevated style={styles.sectionCard}>
                    <View style={styles.sectionHead}>
                        <Ionicons name="resize-outline" size={18} color={C.primary} />
                        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Measurements</Text>
                    </View>
                    <View style={styles.measureGrid}>
                        {allMeasurementFields.map((field) => {
                            const rawVal = existingMeasurements[field.key];
                            const hasVal = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '' && String(rawVal).trim() !== '-';
                            const formattedVal = hasVal
                                ? (String(rawVal).endsWith('"') ? String(rawVal) : `${rawVal}"`)
                                : '-';

                            return (
                                <View key={field.key} style={styles.measureItem}>
                                    <Text style={[styles.measureLabel, { color: C.textMuted }]}>
                                        {field.label}
                                    </Text>
                                    <Text style={[
                                        styles.measureValue,
                                        { color: hasVal ? C.textPrimary : C.textMuted }
                                    ]}>
                                        {formattedVal}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </Card>

                {/* 3. Order Status Tracker Section */}
                <Card elevated style={styles.sectionCard}>
                    <View style={styles.sectionHead}>
                        <Ionicons name="git-branch-outline" size={18} color={C.primary} />
                        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Order Status Tracker</Text>
                    </View>
                    <View style={styles.tracker}>
                        {progressStages.map((stage, idx) => {
                            const isCompleted = idx < currentStageIdx;
                            const isCurrent = idx === currentStageIdx;
                            return (
                                <View key={stage.key} style={styles.trackerStep}>
                                    <View style={styles.trackerLineWrap}>
                                        <View style={[
                                            styles.trackerDot,
                                            { backgroundColor: C.borderLight },
                                            isCompleted && { backgroundColor: C.success },
                                            isCurrent && { backgroundColor: C.primary, ...SHADOWS.golden },
                                        ]}>
                                            <Ionicons
                                                name={isCompleted ? 'checkmark' : stage.icon}
                                                size={14}
                                                color={isCompleted || isCurrent ? C.textOnPrimary : C.textMuted}
                                            />
                                        </View>
                                        {idx < progressStages.length - 1 && (
                                            <View style={[
                                                styles.trackerLine,
                                                { backgroundColor: C.border },
                                                isCompleted && { backgroundColor: C.success }
                                            ]} />
                                        )}
                                    </View>
                                    <View style={styles.trackerContent}>
                                        <Text style={[
                                            styles.trackerLabel,
                                            { color: C.textMuted },
                                            (isCompleted || isCurrent) && [styles.trackerLabelActive, { color: C.textPrimary }],
                                        ]}>{stage.label}</Text>
                                        {isCurrent && (
                                            <Text style={[styles.trackerCurrent, { color: C.primary }]}>Current Stage</Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </Card>

                {/* 4. Payment Section */}
                <Card elevated style={styles.sectionCard}>
                    <View style={styles.sectionHead}>
                        <Ionicons name="wallet-outline" size={18} color={C.primary} />
                        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Payment</Text>
                    </View>
                    <View style={[styles.paymentSummary, { backgroundColor: isDark ? C.bgElevated : '#F8F9FA' }]}>
                        <View style={styles.paymentRow}>
                            <Text style={[styles.paymentLabel, { color: C.textSecondary }]}>Total Amount</Text>
                            <Text style={[styles.paymentValue, { color: C.textPrimary }]}>
                                ₹{totalAmt.toLocaleString('en-IN')}
                            </Text>
                        </View>
                        <View style={styles.paymentRow}>
                            <Text style={[styles.paymentLabel, { color: C.textSecondary }]}>Advance Paid</Text>
                            <Text style={[styles.paymentValue, { color: C.success }]}>
                                ₹{advAmt.toLocaleString('en-IN')}
                            </Text>
                        </View>
                        <View style={[styles.paymentDivider, { backgroundColor: isDark ? C.border : '#E9ECEF' }]} />
                        <View style={styles.paymentRow}>
                            <Text style={[styles.paymentFinalLabel, { color: C.textPrimary }]}>Balance Due</Text>
                            <Text style={[
                                styles.paymentFinalValue,
                                { color: balAmt > 0 ? (isDark ? C.primaryLight : C.primary) : C.success }
                            ]}>
                                ₹{balAmt.toLocaleString('en-IN')}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.progressBarWrap, { backgroundColor: isDark ? C.border : '#E9ECEF' }]}>
                        <View style={[
                            styles.progressBarFill,
                            {
                                width: `${paidPercent}%`,
                                backgroundColor: paidPercent === 100 ? C.success : C.primary
                            }
                        ]} />
                    </View>
                    <Text style={[styles.progressPercent, { color: C.textMuted }]}>
                        {paidPercent}% paid
                    </Text>

                    {balAmt > 0 && (
                        <TouchableOpacity
                            style={[styles.paymentSettleFullBtn, { backgroundColor: C.primary }]}
                            onPress={() => {
                                const performSettle = () => useOrderStore.getState().settleBalance(order.id);
                                if (Platform.OS === 'web') {
                                    if (window.confirm(`Mark the balance of ₹${balAmt.toLocaleString('en-IN')} as paid?`)) {
                                        performSettle();
                                    }
                                } else {
                                    Alert.alert(
                                        'Record Payment',
                                        `Mark the balance of ₹${balAmt.toLocaleString('en-IN')} as paid?`,
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Yes, Paid', onPress: performSettle }
                                        ]
                                    );
                                }
                            }}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="cash-outline" size={18} color={C.textOnPrimary} />
                            <Text style={[styles.paymentSettleFullBtnText, { color: C.textOnPrimary }]}>
                                Record Full Payment Received
                            </Text>
                        </TouchableOpacity>
                    )}
                </Card>

                {/* Optional Notes */}
                {order.notes ? (
                    <Card elevated style={styles.sectionCard}>
                        <View style={styles.sectionHead}>
                            <Ionicons name="document-text-outline" size={18} color={C.primary} />
                            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Notes</Text>
                        </View>
                        <Text style={[styles.notesText, { color: C.textSecondary }]}>{order.notes}</Text>
                    </Card>
                ) : null}

                {/* 5. Delivery Date Section */}
                <Card elevated style={[styles.sectionCard, styles.deliveryCard, {
                    backgroundColor: isDark ? C.primarySoft + '40' : C.primary + '10',
                    borderColor: isDark ? C.primary + '40' : C.primary + '25',
                }]}>
                    <Ionicons name="calendar-outline" size={24} color={C.primary} />
                    <View style={{ marginLeft: SIZES.md, flex: 1 }}>
                        <Text style={[styles.deliveryLabel, { color: C.textMuted }]}>Delivery Date</Text>
                        <Text style={[styles.deliveryDate, { color: C.primary }]}>
                            {formatDate(order.deliveryDate)}
                        </Text>
                    </View>
                </Card>

                {/* Mark as Delivered Action */}
                {order.status === 'Ready' && (
                    <FormButton
                        title="Mark as Delivered"
                        icon="cube-outline"
                        onPress={() => {
                            const performDelivery = async () => {
                                await useOrderStore.getState().markAsDelivered(order);
                                navigation.goBack();
                            };
                            if (Platform.OS === 'web') {
                                if (window.confirm(`Mark ${order.orderNo || order.id} as delivered?`)) {
                                    performDelivery();
                                }
                            } else {
                                Alert.alert(
                                    'Confirm Delivery',
                                    `Mark ${order.orderNo || order.id} as delivered?`,
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Yes, Delivered', onPress: performDelivery }
                                    ]
                                );
                            }
                        }}
                        style={{ marginTop: SIZES.sm, marginBottom: SIZES.lg }}
                    />
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        width: '100%',
        ...Platform.select({
            web: {
                height: '100%',
                maxHeight: '100vh',
                overflowY: 'auto',
            }
        })
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SIZES.lg,
        paddingTop: SIZES.sm,
        paddingBottom: SIZES.md,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    headerTitle: {
        fontSize: SIZES.subtitle,
        ...FONTS.semiBold,
        letterSpacing: 0.5,
    },
    moreBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: SIZES.lg,
        paddingTop: SIZES.xs,
    },
    statusBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SIZES.md,
    },
    dateLabel: {
        fontSize: SIZES.caption,
        ...FONTS.regular,
    },
    sectionCard: {
        marginBottom: SIZES.md,
    },
    sectionHead: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SIZES.md,
    },
    sectionTitle: {
        fontSize: SIZES.bodyLg,
        ...FONTS.semiBold,
        marginLeft: SIZES.sm,
    },
    customerNameDetail: {
        fontSize: SIZES.title,
        ...FONTS.bold,
        marginBottom: SIZES.sm,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SIZES.sm,
    },
    infoLabel: {
        fontSize: SIZES.body,
        ...FONTS.regular,
    },
    infoValue: {
        fontSize: SIZES.body,
        ...FONTS.medium,
    },
    priorityTag: {
        paddingHorizontal: SIZES.md,
        paddingVertical: SIZES.xs,
        borderRadius: SIZES.radiusFull,
    },
    priorityText: {
        fontSize: SIZES.caption,
        ...FONTS.semiBold,
        textTransform: 'capitalize',
    },
    measureGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    measureItem: {
        width: '48%',
        paddingVertical: SIZES.sm,
        paddingRight: SIZES.xs,
    },
    measureLabel: {
        fontSize: SIZES.small,
        ...FONTS.regular,
    },
    measureValue: {
        fontSize: SIZES.bodyLg,
        ...FONTS.semiBold,
        marginTop: 2,
    },
    tracker: {
        paddingLeft: SIZES.xs,
    },
    trackerStep: {
        flexDirection: 'row',
        minHeight: 48,
    },
    trackerLineWrap: {
        alignItems: 'center',
        width: 30,
    },
    trackerDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trackerLine: {
        width: 2,
        flex: 1,
        marginVertical: 2,
    },
    trackerContent: {
        flex: 1,
        marginLeft: SIZES.md,
        paddingBottom: SIZES.sm,
    },
    trackerLabel: {
        fontSize: SIZES.body,
        ...FONTS.regular,
    },
    trackerLabelActive: {
        ...FONTS.semiBold,
    },
    trackerCurrent: {
        fontSize: SIZES.caption,
        ...FONTS.medium,
        marginTop: 2,
    },
    paymentSummary: {
        borderRadius: SIZES.radiusMd,
        padding: SIZES.md,
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SIZES.sm,
    },
    paymentLabel: {
        fontSize: SIZES.body,
        ...FONTS.regular,
    },
    paymentValue: {
        fontSize: SIZES.body,
        ...FONTS.medium,
    },
    paymentDivider: {
        height: 1,
        marginVertical: SIZES.sm,
    },
    paymentFinalLabel: {
        fontSize: SIZES.bodyLg,
        ...FONTS.semiBold,
    },
    paymentFinalValue: {
        fontSize: SIZES.bodyLg,
        ...FONTS.bold,
    },
    progressBarWrap: {
        height: 6,
        borderRadius: 3,
        marginTop: SIZES.md,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: 6,
        borderRadius: 3,
    },
    progressPercent: {
        fontSize: SIZES.caption,
        ...FONTS.regular,
        marginTop: SIZES.xs,
    },
    notesText: {
        fontSize: SIZES.body,
        ...FONTS.regular,
        lineHeight: 20,
    },
    deliveryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        padding: SIZES.base,
    },
    deliveryLabel: {
        fontSize: SIZES.caption,
        ...FONTS.regular,
    },
    deliveryDate: {
        fontSize: SIZES.subtitle,
        ...FONTS.bold,
        marginTop: 2,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SIZES.xl,
    },
    errorText: {
        fontSize: SIZES.bodyLg,
        ...FONTS.semiBold,
        marginTop: SIZES.md,
        textAlign: 'center',
    },
    backToListBtn: {
        marginTop: SIZES.lg,
        paddingHorizontal: SIZES.xl,
        paddingVertical: SIZES.md,
        borderRadius: SIZES.radiusMd,
    },
    backToListText: {
        fontSize: SIZES.body,
        ...FONTS.semiBold,
    },
    paymentSettleFullBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SIZES.md,
        borderRadius: SIZES.radiusMd,
        marginTop: SIZES.md,
        ...SHADOWS.small,
    },
    paymentSettleFullBtnText: {
        fontSize: SIZES.body,
        ...FONTS.bold,
        marginLeft: SIZES.sm,
    },
});

export default OrderDetailScreen;

