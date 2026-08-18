import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../theme';
import { useOrderStore } from '../../store/orderStore';
import { useProductionStore } from '../../store/productionStore';
import {
    StatusBadge, Card, EmptyState,
    LoadingOverlay, ErrorCard, ErrorOverlay, ScreenWrapper, BackButton
} from '../../components/common';

// ─── Inline FilterChip (forms/index.js has no FilterChip export) ─────────────
const FilterChip = ({ label, active, onPress, disabled }) => (
    <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={[
            chipStyles.chip,
            active && chipStyles.chipActive,
        ]}
    >
        <Text style={[chipStyles.chipText, active && chipStyles.chipTextActive]}>
            {label}
        </Text>
    </TouchableOpacity>
);

const chipStyles = StyleSheet.create({
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: COLORS.bgCard,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 8,
    },
    chipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    chipTextActive: {
        color: COLORS.textOnPrimary,
        fontWeight: '700',
    },
});


// ─── Stage Config ────────────────────────────────────────────────────────────
const PRODUCTION_STAGES = [
    { key: 'marking',     label: 'Marking',          icon: 'pencil-outline',                color: COLORS.slate },
    { key: 'production1', label: 'P1-Base',           icon: 'construct-outline',             color: COLORS.primary },
    { key: 'production2', label: 'P2-Aari',           icon: 'flower-outline',                color: COLORS.accent },
    { key: 'production3', label: 'P3-Add-ons',        icon: 'sparkles-outline',              color: COLORS.primary },
    { key: 'cutting',     label: 'Cutting',           icon: 'cut-outline',                   color: COLORS.warning },
    { key: 'stitching',   label: 'Stitching',         icon: 'checkmark-done-circle-outline', color: COLORS.success },
];

const STAGE_KEYS = PRODUCTION_STAGES.map(s => s.key);

// ─── Order Card ───────────────────────────────────────────────────────────────
const OrderCard = React.memo(({ item, onCycleStatus, isLoading }) => {
    const isReady = (item.status || '').toLowerCase() === 'ready';
    const currentStageIdx = STAGE_KEYS.indexOf(item.productionStage);

    const stageInfo = PRODUCTION_STAGES.find(s => s.key === item.productionStage);
    const stageColor = stageInfo ? stageInfo.color : COLORS.textMuted;

    return (
        <Card elevated style={styles.taskCard}>
            {/* Header */}
            <View style={styles.taskHeader}>
                <View style={styles.taskHeaderLeft}>
                    <View>
                        <Text style={styles.taskId}>{item.orderNo || item.id}</Text>
                        <Text style={styles.taskCustomer}>{item.customerName}</Text>
                    </View>
                </View>
                <StatusBadge status={item.status} size="small" />
            </View>

            {/* Info Row */}
            <View style={styles.taskInfo}>
                <View style={styles.taskInfoItem}>
                    <Ionicons name="shirt-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.taskInfoText}>{item.designName || 'No design'}</Text>
                </View>
                <View style={styles.taskInfoItem}>
                    <Ionicons name="person-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.taskInfoText}>{item.tailorName || 'Unassigned'}</Text>
                </View>
            </View>

            {/* Progress Track */}
            <View style={styles.trackContainer}>
                {PRODUCTION_STAGES.map((s, idx) => {
                    const isDone = currentStageIdx > idx || isReady;
                    const isCurrent = currentStageIdx === idx && !isReady;
                    return (
                        <View key={s.key} style={styles.trackStep}>
                            <View style={[
                                styles.trackDot,
                                isDone && { backgroundColor: COLORS.success },
                                isCurrent && { backgroundColor: s.color, borderWidth: 2, borderColor: COLORS.bgCard },
                            ]} />
                        </View>
                    );
                })}
            </View>

            {/* Action Footer */}
            <TouchableOpacity
                style={[
                    styles.cycleBtn,
                    { backgroundColor: isReady ? COLORS.successLight : stageColor + '18' }
                ]}
                onPress={() => onCycleStatus(item.id, item.productionStage)}
                disabled={isLoading || isReady}
                activeOpacity={0.8}
            >
                <Ionicons
                    name={isReady ? 'checkmark-circle' : 'play-forward-outline'}
                    size={16}
                    color={isReady ? COLORS.success : stageColor}
                />
                <Text style={[
                    styles.cycleBtnText,
                    { color: isReady ? COLORS.success : stageColor }
                ]}>
                    {isReady
                        ? 'Ready for Finishing'
                        : currentStageIdx === -1
                            ? 'Start Marking'
                            : currentStageIdx === PRODUCTION_STAGES.length - 1
                                ? 'Mark as Ready'
                                : `Move to ${PRODUCTION_STAGES[currentStageIdx + 1]?.label || 'Next'}`
                    }
                </Text>
            </TouchableOpacity>
        </Card>
    );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const StitchingProductionScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { width: winWidth } = useWindowDimensions();
    const isWide = winWidth >= 600;

    const orders = useOrderStore(s => s.orders);
    const tailors = useOrderStore(s => s.tailors);
    const isLoading = useOrderStore(s => s.isLoading);
    const error = useOrderStore(s => s.error);
    const clearError = useOrderStore(s => s.clearError);
    const updateProdStatus = useProductionStore(s => s.updateProductionStatus);

    const [filterTailor, setFilterTailor] = useState('all');
    const [isUpdating, setIsUpdating] = useState(false);

    const filteredOrders = useMemo(() => {
        const safeOrders = Array.isArray(orders) ? orders : [];
        return safeOrders.filter(o => {
            const status = (o?.status || '').toLowerCase().trim();
            if (['ready', 'delivered', 'cancelled', 'on_hold', 'hold'].includes(status)) return false;
            if (filterTailor !== 'all' && o.tailorId !== filterTailor) return false;
            return true;
        });
    }, [orders, filterTailor]);

    const onRefresh = useCallback(() => {}, []);

    const cycleStatus = useCallback(async (orderId, currentStage) => {
        const stages = ['pending', 'marking', 'production1', 'production2', 'production3', 'cutting', 'stitching'];
        const idx = stages.indexOf(currentStage);
        setIsUpdating(true);
        try {
            if (currentStage === 'stitching') {
                const { productionService } = await import('../../services/productionService');
                await productionService.markAsReady(orderId, 'Production');
            } else {
                const nextStage = idx === -1 ? 'marking' : (stages[idx + 1] || 'stitching');
                let nextStatusLabel = 'In Production';
                if (nextStage === 'marking') nextStatusLabel = 'Marking';
                if (nextStage === 'cutting') nextStatusLabel = 'Cutting';
                await updateProdStatus(orderId, 'status', nextStatusLabel);
                await updateProdStatus(orderId, 'productionStage', nextStage);
            }
        } finally {
            setIsUpdating(false);
        }
    }, [updateProdStatus]);

    const renderItem = useCallback(({ item }) => (
        <View style={isWide ? { flex: 1, marginHorizontal: 6 } : undefined}>
            <OrderCard item={item} onCycleStatus={cycleStatus} isLoading={isLoading} />
        </View>
    ), [cycleStatus, isLoading, isWide]);

    return (
        <ScreenWrapper useSafeTop useSafeBottom={false}>
            <LoadingOverlay visible={isUpdating} message="Updating status..." />
            <ErrorOverlay
                visible={!!error && filteredOrders.length > 0}
                error={error}
                onRetry={onRefresh}
                onClose={clearError}
            />

            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {navigation.canGoBack() && (
                        <BackButton onPress={() => navigation.goBack()} style={{ marginRight: SIZES.sm }} />
                    )}
                    <View>
                        <Text style={styles.headerTitle}>Production</Text>
                        <Text style={styles.headerSubtitle}>{filteredOrders.length} orders in pipeline</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, marginBottom: 12 }}
                contentContainerStyle={styles.filtersRow}
                keyboardShouldPersistTaps="handled"
            >
                <FilterChip
                    label="All Tailors"
                    active={filterTailor === 'all'}
                    onPress={() => setFilterTailor('all')}
                    disabled={isLoading}
                />
                {(tailors || []).map(t => (
                    <FilterChip
                        key={t.id}
                        label={t.name}
                        active={filterTailor === t.id}
                        onPress={() => setFilterTailor(t.id)}
                        disabled={isLoading}
                    />
                ))}
            </ScrollView>

            {isLoading && filteredOrders.length === 0 ? (
                <View style={styles.centerMsg}>
                    <Text style={styles.centerMsgText}>Loading production...</Text>
                </View>
            ) : error && filteredOrders.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <ErrorCard
                        title="Failed to load Production"
                        message={error}
                        onRetry={onRefresh}
                    />
                </View>
            ) : filteredOrders.length === 0 ? (
                <EmptyState
                    icon="construct-outline"
                    title="No production orders"
                    subtitle="Orders in production will appear here"
                />
            ) : (
                <FlatList
                    key={isWide ? 'prod-grid-2' : 'prod-single-1'}
                    numColumns={isWide ? 2 : 1}
                    data={filteredOrders}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={[styles.listContent, { paddingBottom: 140 + insets.bottom }]}
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1 }}
                    refreshing={isLoading}
                    onRefresh={onRefresh}
                    initialNumToRender={6}
                    windowSize={5}
                    maxToRenderPerBatch={5}
                    removeClippedSubviews={Platform.OS === 'android'}
                />
            )}
        </ScreenWrapper>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    header: {
        paddingHorizontal: SIZES.lg,
        paddingTop: SIZES.lg,
        paddingBottom: SIZES.sm,
    },
    headerTitle: {
        fontSize: SIZES.heading,
        color: COLORS.textPrimary,
        ...FONTS.bold,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: SIZES.small,
        color: COLORS.textMuted,
        ...FONTS.regular,
        marginTop: 2,
    },
    filtersRow: {
        paddingHorizontal: SIZES.lg,
        paddingVertical: SIZES.sm,
    },
    listContent: {
        paddingHorizontal: SIZES.lg,
        paddingBottom: 20,
    },
    centerMsg: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SIZES.lg,
    },
    centerMsgText: {
        color: COLORS.textMuted,
        fontSize: SIZES.body,
        ...FONTS.regular,
    },
    taskCard: {
        marginBottom: SIZES.md,
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SIZES.md,
    },
    taskHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stageIcon: {
        width: 36,
        height: 36,
        borderRadius: SIZES.radiusMd,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SIZES.md,
    },
    taskId: {
        fontSize: SIZES.caption,
        color: COLORS.textMuted,
        ...FONTS.medium,
        letterSpacing: 0.5,
    },
    taskCustomer: {
        fontSize: SIZES.bodyLg,
        color: COLORS.textPrimary,
        ...FONTS.semiBold,
    },
    taskInfo: {
        flexDirection: 'row',
        marginBottom: SIZES.md,
    },
    taskInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: SIZES.lg,
    },
    taskInfoText: {
        fontSize: SIZES.small,
        color: COLORS.textSecondary,
        marginLeft: 5,
        ...FONTS.regular,
    },
    stagesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        backgroundColor: COLORS.bgElevated,
        borderRadius: SIZES.radiusMd,
        paddingVertical: SIZES.sm,
        paddingHorizontal: SIZES.sm,
        marginBottom: SIZES.md,
    },
    miniStage: {
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
    },
    miniStageDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.border,
        marginBottom: 3,
    },
    miniStageLabel: {
        fontSize: 9,
        color: COLORS.textMuted,
        textAlign: 'center',
        ...FONTS.regular,
    },
    taskActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: SIZES.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    taskFooterLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    taskFooterText: {
        fontSize: SIZES.small,
        color: COLORS.textMuted,
        ...FONTS.medium,
        marginLeft: 6,
    },
    statusCycleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: SIZES.md,
        paddingVertical: SIZES.xs + 2,
        borderRadius: SIZES.radiusFull,
        backgroundColor: COLORS.primaryMuted,
        borderWidth: 1,
        borderColor: COLORS.primarySoft,
    },
    statusCycleText: {
        fontSize: SIZES.small,
        color: COLORS.primary,
        ...FONTS.semiBold,
    },
});

export default StitchingProductionScreen;
