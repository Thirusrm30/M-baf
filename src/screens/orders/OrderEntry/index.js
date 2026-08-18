import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, getColors } from '../../../theme';
import { useThemeStore } from '../../../store/themeStore';
import { useOrderStore } from '../../../store/orderStore';
import { FormButton } from '../../../components/forms';
import { LoadingOverlay, ErrorOverlay, ScreenWrapper } from '../../../components/common';

// Sub-components
import StepCustomer from './StepCustomer';
import StepDesign from './StepDesign';
import StepMeasurements, { getEmptyMeasurements, REQUIRED_MEASUREMENT_KEYS } from './StepMeasurements';
import StepPayment from './StepPayment';
import styles from './orderEntryStyles';
import AnimatedProgressBar from '../../../components/animations/AnimatedProgressBar';

const STEPS = ['Customer', 'Design', 'Measurements', 'Payment & Delivery'];

const isValidDateInput = (value) => {
    if (!value || typeof value !== 'string') return false;
    const str = value.trim();

    // Check YYYY-MM-DD or YYYY/MM/DD
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
        const [y, m, d] = str.split(/[-/]/).map(Number);
        if (m < 1 || m > 12) return false;
        const daysInMonth = new Date(y, m, 0).getDate();
        return d >= 1 && d <= daysInMonth;
    }

    // Check DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(str)) {
        const [d, m, y] = str.split(/[-/]/).map(Number);
        if (m < 1 || m > 12) return false;
        const daysInMonth = new Date(y, m, 0).getDate();
        return d >= 1 && d <= daysInMonth;
    }

    return false;
};

const normalizeDeliveryDate = (val) => {
    if (!val || typeof val !== 'string') return val;
    const str = val.trim();
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(str)) {
        const parts = str.split(/[-/]/);
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2];
        return `${y}-${m}-${d}`;
    }
    return str;
};

const isValidAmount = (value) => {
    if (value === undefined || value === null) return false;
    const str = String(value).trim();
    if (str.length === 0) return false;
    const amount = parseFloat(str);
    return isFinite(amount) && amount >= 0;
};

const OrderEntryContainer = ({ navigation }) => {
    const isDark = useThemeStore(s => s.isDark);
    const C = getColors(isDark);
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(0);
    const designTemplates = useOrderStore((s) => s.designTemplates);

    const addOrder = useOrderStore((s) => s.addOrder);
    const saveDraft = useOrderStore((s) => s.saveDraft);
    const draftOrder = useOrderStore((s) => s.draftOrder);
    const isLoading = useOrderStore((s) => s.isLoading);
    const error = useOrderStore((s) => s.error);
    const clearError = useOrderStore((s) => s.clearError);

    const [form, setForm] = useState(draftOrder || {
        customerId: '',
        customerName: '',
        phone: '',
        design: {
            blousePattern: null,
            frontNeck: null,
            backNeck: null,
            aariDesign: null,
        },
        measurements: getEmptyMeasurements(),
        deliveryDate: '',
        totalAmount: '',
        advanceAmount: '',
        notes: '',
        tailorId: '',
        tailorName: '',
        priority: 'medium',
    });

    const updateForm = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleCustomerSelect = (customerId) => {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            // Batch all three in one update so form state is always consistent
            setForm(prev => ({
                ...prev,
                customerId,
                customerName: customer.name || '',
                phone: customer.phone || '',
            }));
        }
    };

    const handleDesignCategorySelect = (category, itemId) => {
        setForm(prev => ({
            ...prev,
            design: { ...prev.design, [category]: itemId },
        }));
    };

    const handleTailorNameChange = (name) => {
        setForm(prev => ({
            ...prev,
            tailorName: name,
            tailorId: '',
        }));
    };

    const handleMeasurementChange = (field, value) => {
        setForm(prev => ({
            ...prev,
            measurements: { ...prev.measurements, [field]: value },
        }));
    };

    const canProceed = () => {
        if (isLoading) return false;
        switch (step) {
            case 0: return form.customerName && form.customerName.trim().length > 0;
            case 1: {
                const { blousePattern, frontNeck, backNeck, aariDesign } = form.design;
                return !!(blousePattern && frontNeck && backNeck && aariDesign);
            }
            case 2: {
                const m = form.measurements;
                return REQUIRED_MEASUREMENT_KEYS.every(key => m[key] && m[key].trim().length > 0);
            }
            case 3: return isValidAmount(form.totalAmount) && isValidDateInput(form.deliveryDate);
            default: return false;
        }
    };

    const handleSubmit = async () => {
        if (!canProceed()) {
            if (!isValidAmount(form.totalAmount)) {
                const msg = 'Please enter a valid Total Amount.';
                if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Input', msg);
                return;
            }
            if (!isValidDateInput(form.deliveryDate)) {
                const msg = 'Please enter a valid Delivery Date (e.g. YYYY-MM-DD or DD-MM-YYYY) or pick a quick date preset.';
                if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Invalid Date', msg);
                return;
            }
            return;
        }

        const totalAmt = parseFloat(form.totalAmount) || 0;
        const advanceAmt = parseFloat(form.advanceAmount) || 0;
        const normalizedDate = normalizeDeliveryDate(form.deliveryDate);
        const order = {
            ...form,
            deliveryDate: normalizedDate,
            totalAmount: totalAmt,
            advanceAmount: advanceAmt,
            balanceAmount: totalAmt - advanceAmt,
            status: 'Pending',
            productionStage: 'pending',
        };

        try {
            await addOrder(order);
            if (Platform.OS === 'web') {
                window.alert('Order created successfully!');
                navigation.goBack();
            } else {
                Alert.alert('Success', 'Order created successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            }
        } catch (error) {
            // Error overlay handled by store state
        }
    };

    const handleSaveDraft = () => {
        saveDraft(form);
        if (Platform.OS === 'web') {
            window.alert('Draft saved successfully!');
        } else {
            Alert.alert('Saved', 'Draft saved successfully!');
        }
    };



    const renderStepContent = () => {
        const commonProps = { form, updateForm, styles, isLoading };
        switch (step) {
            case 0:
                return (
                    <StepCustomer
                        {...commonProps}
                    />
                );
            case 1:
                return (
                    <StepDesign
                        {...commonProps}
                        designTemplates={designTemplates}
                        handleDesignCategorySelect={handleDesignCategorySelect}
                        handleTailorNameChange={handleTailorNameChange}
                    />
                );
            case 2:
                return (
                    <StepMeasurements
                        {...commonProps}
                        handleMeasurementChange={handleMeasurementChange}
                    />
                );
            case 3:
                return <StepPayment {...commonProps} />;
            default:
                return null;
        }
    };

    return (
        <ScreenWrapper useSafeTop useSafeBottom={false}>
            <KeyboardAvoidingView
                style={[styles.container, { backgroundColor: C.bg }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <LoadingOverlay visible={isLoading && !error} message="Creating order..." />
                <ErrorOverlay
                    visible={!!error}
                    error={error}
                    onRetry={handleSubmit}
                    onClose={clearError}
                />
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} disabled={isLoading}>
                        <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: C.textPrimary }]}>New Order</Text>
                    <TouchableOpacity onPress={handleSaveDraft} style={styles.draftBtn} disabled={isLoading}>
                        <Ionicons name="bookmark-outline" size={18} color={C.primary} />
                        <Text style={[styles.draftText, { color: C.primary }]}>Draft</Text>
                    </TouchableOpacity>
                </View>

                {/* Progress Indicator */}
                <AnimatedProgressBar progress={step} totalSteps={STEPS.length} />

                <View style={styles.progressContainer}>
                    {STEPS.map((s, idx) => (
                        <View key={idx} style={styles.progressStep}>
                            <View style={[
                                styles.progressDot,
                                { backgroundColor: C.bgElevated, borderColor: C.border },
                                idx < step && [styles.progressDotCompleted, { backgroundColor: C.success, borderColor: C.success }],
                                idx === step && [styles.progressDotActive, { backgroundColor: C.primary, borderColor: C.primary }],
                            ]}>
                                {idx < step ? (
                                    <Ionicons name="checkmark" size={12} color={C.textOnPrimary} />
                                ) : (
                                    <Text style={[styles.progressNum, { color: C.textMuted }, idx === step && { color: C.textOnPrimary }]}>{idx + 1}</Text>
                                )}
                            </View>
                            <Text style={[styles.progressLabel, { color: C.textMuted }, idx === step && [styles.progressLabelActive, { color: C.primary }]]}>{s}</Text>
                        </View>
                    ))}
                </View>

                {/* Step Content */}
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentInner}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={styles.stepTitle}>{STEPS[step]}</Text>
                    {renderStepContent()}
                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Bottom Bar */}
                <View style={[styles.bottomBar, { backgroundColor: C.bgCard, borderTopColor: C.borderLight, paddingBottom: insets.bottom > 0 ? insets.bottom : SIZES.md }]}>
                    {step > 0 && (
                        <FormButton
                            title="Back"
                            variant="outline"
                            icon="arrow-back-outline"
                            onPress={() => setStep(step - 1)}
                            size="medium"
                            disabled={isLoading}
                        />
                    )}
                    <View style={{ flex: 1, marginLeft: step > 0 ? SIZES.sm : 0 }}>
                        {step < STEPS.length - 1 ? (
                            <FormButton
                                title="Continue"
                                icon="arrow-forward-outline"
                                onPress={() => setStep(step + 1)}
                                disabled={!canProceed()}
                            />
                        ) : (
                            <FormButton
                                title="Create Order"
                                icon="checkmark-circle-outline"
                                onPress={handleSubmit}
                                disabled={isLoading}
                                loading={isLoading}
                            />
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
};

export default OrderEntryContainer;
