<template>
    <div>
        <a-select
            v-model:value="selectedQuickOption"
            @change="handleQuickSelect"
            style="width: 100%"
            class="recurrence-select"
        >
            <template #suffixIcon>
                <div
                    v-if="localRule"
                    class="clear-icon"
                    @click.stop="clearRecurrence"
                >
                    <CloseCircleFilled />
                </div>
            </template>
            <a-select-option value="none">{{
                $t("calendar.does_not_repeat")
            }}</a-select-option>
            <a-select-option value="daily">{{
                $t("calendar.daily")
            }}</a-select-option>
            <a-select-option value="weekly">{{
                $t("calendar.weekly_on", { day: dayOfWeekName })
            }}</a-select-option>
            <a-select-option value="monthly">{{
                $t("calendar.monthly_on_the", {
                    position: getMonthlyPosition(),
                })
            }}</a-select-option>
            <a-select-option value="annually">{{
                $t("calendar.annually_on", { day: monthDayName })
            }}</a-select-option>
            <a-select-option value="weekday">{{
                $t("calendar.every_weekday")
            }}</a-select-option>
            <a-select-option value="custom">
                {{ isCustomRule ? generatedCustomText : $t("calendar.custom") }}
            </a-select-option>
        </a-select>

        <!-- Custom Recurrence Modal -->
        <a-modal
            v-model:visible="isCustomModalVisible"
            :title="$t('calendar.custom_recurrence')"
            @ok="saveCustomRule"
            @cancel="cancelCustomRule"
            :okText="$t('common.done')"
            :cancelText="$t('common.cancel')"
            destroyOnClose
            class="custom-recurrence-modal"
            :width="400"
            :z-index="10000"
            :maskClosable="false"
        >
            <div class="space-y-6">
                <!-- Repeat Every -->
                <div class="flex items-center gap-4">
                    <span class="text-gray-600">{{
                        $t("calendar.repeat_every")
                    }}</span>
                    <a-input-number
                        v-model:value="customState.interval"
                        :min="1"
                        :max="99"
                        class="w-16"
                    />
                    <a-select
                        v-model:value="customState.frequency"
                        class="w-28"
                        :getPopupContainer="(trigger) => trigger.parentNode"
                    >
                        <a-select-option value="daily">{{
                            customState.interval > 1
                                ? $t("calendar.days")
                                : $t("calendar.day")
                        }}</a-select-option>
                        <a-select-option value="weekly">{{
                            customState.interval > 1
                                ? $t("calendar.weeks")
                                : $t("calendar.week")
                        }}</a-select-option>
                        <a-select-option value="monthly">{{
                            customState.interval > 1
                                ? $t("calendar.months")
                                : $t("calendar.month")
                        }}</a-select-option>
                        <a-select-option value="annually">{{
                            customState.interval > 1
                                ? $t("calendar.years")
                                : $t("calendar.year")
                        }}</a-select-option>
                    </a-select>
                </div>

                <!-- Repeat On (Weekly Only) -->
                <div
                    v-if="customState.frequency === 'weekly'"
                    class="space-y-2"
                >
                    <div class="text-gray-600">
                        {{ $t("calendar.repeat_on") }}
                    </div>
                    <div class="flex gap-2 justify-between">
                        <div
                            v-for="day in dayOptions"
                            :key="day.value"
                            @click="toggleDay(day.value)"
                            class="day-circle"
                            :class="{
                                'day-circle-selected':
                                    customState.byday.includes(day.value),
                            }"
                        >
                            {{ day.label }}
                        </div>
                    </div>
                </div>

                <!-- Ends -->
                <div class="space-y-4">
                    <div class="text-gray-600">
                        {{ $t("calendar.ends") }}
                    </div>

                    <!-- Ends Radio Group -->
                    <a-radio-group
                        v-model:value="customState.endType"
                        class="w-full space-y-3 flex flex-col"
                    >
                        <a-radio value="never">{{
                            $t("calendar.never")
                        }}</a-radio>

                        <div class="flex items-center gap-4">
                            <a-radio value="until" class="min-w-16">{{
                                $t("calendar.on_date")
                            }}</a-radio>
                            <a-date-picker
                                v-model:value="customState.untilDate"
                                :disabled="customState.endType !== 'until'"
                                :allowClear="false"
                                format="MMM D, YYYY"
                                class="flex-1"
                                :getPopupContainer="
                                    (trigger) => trigger.parentNode
                                "
                            />
                        </div>

                        <div class="flex items-center gap-4">
                            <a-radio value="count" class="min-w-16">{{
                                $t("calendar.after")
                            }}</a-radio>
                            <div class="flex items-center gap-2 flex-1">
                                <a-input-number
                                    v-model:value="customState.count"
                                    :disabled="customState.endType !== 'count'"
                                    :min="1"
                                    :max="999"
                                    class="w-40"
                                >
                                    <template #addonAfter>
                                        {{ $t("calendar.occurrences") }}
                                    </template>
                                </a-input-number>
                            </div>
                        </div>
                    </a-radio-group>
                </div>
            </div>
        </a-modal>
    </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from "vue";
import moment from "moment";
import { CloseCircleFilled } from "@ant-design/icons-vue";
import { useI18n } from "vue-i18n";

/**
 * Recurrence Rule JSON Format Expected output:
 * {
 *   "frequency": "daily" | "weekly" | "monthly" | "annually",
 *   "interval": 1,
 *   "byday": ["MO", "WE", "FR"], // optional, mainly for weekly
 *   "count": 13, // optional end condition
 *   "until": "2026-05-30" // optional end condition
 * }
 */

const props = defineProps({
    modelValue: {
        type: [String, Object],
        default: null,
    },
    startDate: {
        type: [String, Object], // moment, string YYYY-MM-DD, or Date
        required: true,
    },
});

const emit = defineEmits(["update:modelValue", "change", "modalState"]);

const { t } = useI18n();

const localRule = ref(null);
const selectedQuickOption = ref("none");
const isCustomModalVisible = ref(false);

watch(isCustomModalVisible, (val) => {
    if (!val) {
        setTimeout(() => {
            emit("modalState", val);
        }, 150);
    } else {
        emit("modalState", val);
    }
});

const dayMap = {
    0: "SU",
    1: "MO",
    2: "TU",
    3: "WE",
    4: "TH",
    5: "FR",
    6: "SA",
};

const dayOptions = [
    { label: "S", value: "SU" },
    { label: "M", value: "MO" },
    { label: "T", value: "TU" },
    { label: "W", value: "WE" },
    { label: "T", value: "TH" },
    { label: "F", value: "FR" },
    { label: "S", value: "SA" },
];

const customState = ref({
    frequency: "weekly",
    interval: 1,
    byday: [],
    endType: "never",
    untilDate: moment(),
    count: 13,
});

const startMoment = computed(() => {
    if (!props.startDate) return moment();
    return moment(props.startDate);
});

const dayOfWeekName = computed(() => {
    return startMoment.value.format("dddd");
});

const monthDayName = computed(() => {
    return startMoment.value.format("MMMM D");
});

const getMonthlyPosition = () => {
    const d = startMoment.value;
    const dayName = d.format("dddd");
    const nth = Math.ceil(d.date() / 7);
    const suffix = ["th", "st", "nd", "rd"][nth > 3 ? 0 : nth] || "th";
    return `${nth}${suffix} ${dayName}`;
};

const isCustomRule = computed(() => {
    return selectedQuickOption.value === "custom" && localRule.value;
});

const generatedCustomText = computed(() => {
    if (!localRule.value) return t("calendar.custom");
    const r = localRule.value;

    // Parse values for dynamic translation
    const intervalVal = r.interval > 1 ? r.interval + " " : "";
    const isPlural = r.interval > 1;

    let freqStr = "";
    if (r.frequency === "daily")
        freqStr = isPlural ? t("calendar.days") : t("calendar.day");
    else if (r.frequency === "weekly")
        freqStr = isPlural ? t("calendar.weeks") : t("calendar.week");
    else if (r.frequency === "monthly")
        freqStr = isPlural ? t("calendar.months") : t("calendar.month");
    else freqStr = isPlural ? t("calendar.years") : t("calendar.year");

    let text = t("calendar.custom_every", {
        interval: intervalVal,
        frequency: freqStr,
    });

    if (r.frequency === "weekly" && r.byday && r.byday.length > 0) {
        text += " " + t("calendar.on_days", { days: r.byday.join(", ") });
    }

    if (r.count) {
        text += ", " + t("calendar.times", { count: r.count });
    } else if (r.until) {
        text +=
            ", " +
            t("calendar.until", {
                date: moment(r.until).format("MMM D, YYYY"),
            });
    }

    return text;
});

const parseIncomingRule = (ruleValue) => {
    if (!ruleValue) {
        localRule.value = null;
        selectedQuickOption.value = "none";
        return;
    }

    let parsed = ruleValue;
    if (typeof ruleValue === "string") {
        try {
            parsed = JSON.parse(ruleValue);
        } catch (e) {
            console.error("Invalid recurrence rule string", ruleValue);
            return;
        }
    }

    localRule.value = parsed;

    // Try to match quick options
    if (parsed.interval === 1 && !parsed.count && !parsed.until) {
        if (parsed.frequency === "daily") {
            selectedQuickOption.value = "daily";
            return;
        }
        if (parsed.frequency === "weekly") {
            const startDay = dayMap[startMoment.value.day()];
            if (
                !parsed.byday ||
                (parsed.byday.length === 1 && parsed.byday[0] === startDay)
            ) {
                selectedQuickOption.value = "weekly";
                return;
            }
            // Check for weekday
            if (
                parsed.byday &&
                parsed.byday.length === 5 &&
                ["MO", "TU", "WE", "TH", "FR"].every((d) =>
                    parsed.byday.includes(d),
                )
            ) {
                selectedQuickOption.value = "weekday";
                return;
            }
        }
        if (parsed.frequency === "monthly") {
            selectedQuickOption.value = "monthly";
            return;
        }
        if (parsed.frequency === "annually") {
            selectedQuickOption.value = "annually";
            return;
        }
    }

    selectedQuickOption.value = "custom";
};

const updateRule = (rule) => {
    localRule.value = rule;
    const ruleStr = rule ? JSON.stringify(rule) : null;
    emit("update:modelValue", ruleStr);
    emit("change", ruleStr);
};

const clearRecurrence = () => {
    selectedQuickOption.value = "none";
    updateRule(null);
};

const handleQuickSelect = (value) => {
    const startDay = dayMap[startMoment.value.day()];

    if (value === "none") {
        updateRule(null);
    } else if (value === "daily") {
        updateRule({ frequency: "daily", interval: 1 });
    } else if (value === "weekly") {
        updateRule({ frequency: "weekly", interval: 1, byday: [startDay] });
    } else if (value === "monthly") {
        updateRule({ frequency: "monthly", interval: 1 });
    } else if (value === "annually") {
        updateRule({ frequency: "annually", interval: 1 });
    } else if (value === "weekday") {
        updateRule({
            frequency: "weekly",
            interval: 1,
            byday: ["MO", "TU", "WE", "TH", "FR"],
        });
    } else if (value === "custom") {
        openCustomModal();
    }
};

const openCustomModal = () => {
    // Initialize custom state from current rule if exists
    if (localRule.value) {
        customState.value.frequency = localRule.value.frequency || "weekly";
        customState.value.interval = localRule.value.interval || 1;
        customState.value.byday = localRule.value.byday || [
            dayMap[startMoment.value.day()],
        ];

        if (localRule.value.count) {
            customState.value.endType = "count";
            customState.value.count = localRule.value.count;
        } else if (localRule.value.until) {
            customState.value.endType = "until";
            customState.value.untilDate = moment(localRule.value.until);
        } else {
            customState.value.endType = "never";
        }
    } else {
        // Defaults if no rule exists
        customState.value.frequency = "weekly";
        customState.value.interval = 1;
        customState.value.byday = [dayMap[startMoment.value.day()]];
        customState.value.endType = "never";
        customState.value.untilDate = startMoment.value
            .clone()
            .add(1, "months");
        customState.value.count = 13;
    }
    isCustomModalVisible.value = true;
};

const toggleDay = (dayValue) => {
    const index = customState.value.byday.indexOf(dayValue);
    if (index === -1) {
        customState.value.byday.push(dayValue);
    } else {
        // Prevent removing the only selected day
        if (customState.value.byday.length > 1) {
            customState.value.byday.splice(index, 1);
        }
    }
};

const saveCustomRule = () => {
    const rule = {
        frequency: customState.value.frequency,
        interval: customState.value.interval,
    };

    if (rule.frequency === "weekly") {
        // Sort byday to match actual week order (Sun -> Sat) if desired, but array is fine
        rule.byday = [...customState.value.byday];
    }

    if (customState.value.endType === "count") {
        rule.count = customState.value.count;
    } else if (customState.value.endType === "until") {
        rule.until = customState.value.untilDate.format("YYYY-MM-DD");
    }

    updateRule(rule);
    isCustomModalVisible.value = false;
};

const cancelCustomRule = () => {
    isCustomModalVisible.value = false;
    // Revert to previously selected quick option if we cancelled custom creation
    parseIncomingRule(props.modelValue);
};

watch(
    () => props.modelValue,
    (newVal) => {
        if (JSON.stringify(localRule.value) !== JSON.stringify(newVal)) {
            parseIncomingRule(newVal);
        }
    },
    { immediate: true },
);

watch(
    () => props.startDate,
    () => {
        // If the start date changes, re-evaluate the text representation and possibly update the rule
        if (
            localRule.value &&
            localRule.value.frequency === "weekly" &&
            selectedQuickOption.value !== "custom"
        ) {
            // If it's a basic weekly rule, update the base day
            if (selectedQuickOption.value === "weekly") {
                const startDay = dayMap[startMoment.value.day()];
                updateRule({ ...localRule.value, byday: [startDay] });
            }
        }
    },
);
</script>

<style scoped>
.recurrence-select :deep(.ant-select-selection-item) {
    display: flex;
    align-items: center;
}

.clear-icon {
    font-size: 14px;
    color: #bfbfbf;
    cursor: pointer;
    transition: color 0.3s;
    pointer-events: auto;
}

.clear-icon:hover {
    color: #ff4d4f;
}

.day-circle {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: #f0f0f0;
    color: #595959;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s;
}

.day-circle:hover {
    background-color: #e6e6e6;
}

.day-circle-selected {
    background-color: #1890ff;
    color: white;
}

.day-circle-selected:hover {
    background-color: #40a9ff;
}
</style>
