<template>
    <a-form layout="vertical" class="mt-4">
        <a-form-item :label="$t('common.title')" :required="!readOnly">
            <template v-if="readOnly">
                <div class="flex items-center gap-2">
                    <span
                        v-if="formData.color"
                        class="inline-block w-3 h-3 rounded-full flex-shrink-0"
                        :style="{ backgroundColor: formData.color }"
                    />
                    <span class="text-sm text-gray-800 font-medium">{{ formData.title || '-' }}</span>
                </div>
            </template>
            <template v-else>
                <a-row :gutter="16">
                    <a-col :span="5">
                        <ColorInput
                            :value="formData.color"
                            @colorChanged="(val) => updateForm('color', val)"
                            :showCustomColor="false"
                        />
                    </a-col>
                    <a-col :span="19">
                        <a-input
                            :value="formData.title"
                            @input="(e) => updateForm('title', e.target.value)"
                            :placeholder="$t('common.title')"
                        />
                    </a-col>
                </a-row>
            </template>
        </a-form-item>

        <!-- Date / Time Range -->
        <a-row>
            <a-col :span="24">
                <template v-if="readOnly">
                    <div class="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        <CalendarOutlined class="text-gray-400" />
                        <span>{{ formData.selectedDate_full }}</span>
                        <template v-if="formData.selectedTimeSlot && !(isTask && formData.is_all_day)">
                            <span class="text-gray-400">|</span>
                            <ClockCircleOutlined class="text-gray-400" />
                            <span>{{ formData.selectedTimeSlot }} - {{ formData.endTime }}</span>
                        </template>
                        <a-tag v-if="isTask && formData.is_all_day" color="blue" class="ml-1">{{ $t('calendar.all_day', 'All Day') }}</a-tag>
                    </div>
                    <div v-if="formData.recurrence_rule" class="text-xs text-blue-500 mb-2">
                        <SyncOutlined class="mr-1" /> {{ $t('calendar.recurring') }}
                    </div>
                </template>
                <template v-else>
                    <DateTimeRangePicker
                        :date="formData.selectedDate_full"
                        :startTime="formData.selectedTimeSlot"
                        :endTime="formData.endTime"
                        :endDate="computedEndDate"
                        :hideTime="isTask && !!formData.is_all_day"
                        :minuteStep="isTask ? 1 : 15"
                        :disablePastStartTime="isTask && !readOnly && !formData.id && !formData.is_all_day"
                        @update:date="(val) => handleDateUpdate(val)"
                        @update:startTime="(val) => handleStartTimeUpdate(val)"
                        @update:endTime="(val) => handleEndTimeUpdate(val)"
                    />
                </template>
            </a-col>
        </a-row>

        <!-- All Day (task only, edit mode) -->
        <a-row v-if="isTask && !readOnly" class="mb-4">
            <a-col :span="24" class="flex items-center gap-3">
                <a-switch
                    :checked="!!formData.is_all_day"
                    @change="(checked) => handleTaskAllDayChange(checked)"
                />
                <span class="text-gray-700 ml-2">{{
                    $t("calendar.all_day", "All Day")
                }}</span>
            </a-col>
        </a-row>

        <a-row v-if="!readOnly" class="mb-4">
            <a-col :span="24">
                <RecurrenceSelect
                    :modelValue="formData.recurrence_rule"
                    @update:modelValue="
                        (val) => updateForm('recurrence_rule', val)
                    "
                    :startDate="computedStartDateForRecurrence"
                    @modalState="(val) => $emit('modalState', val)"
                />
            </a-col>
        </a-row>

        <!-- Doctor Information Display (event only, when pre-selected) -->
        <a-row
            v-if="!isTask && autoSelectDoctor && doctorInfo && doctorInfo.name"
            :gutter="16"
            class="mb-4"
        >
            <a-col :span="24">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div class="flex items-center gap-3">
                        <a-avatar
                            :size="48"
                            :src="
                                doctorInfo.profile_image_url ||
                                doctorInfo.user?.profile_image_url
                            "
                            class="flex-shrink-0"
                        >
                            {{
                                (
                                    doctorInfo.name ||
                                    doctorInfo.user?.name ||
                                    "D"
                                ).charAt(0)
                            }}
                        </a-avatar>
                        <div class="flex-1">
                            <div class="text-base font-semibold text-gray-800">
                                {{ doctorInfo.name || doctorInfo.user?.name }}
                            </div>
                            <div
                                v-if="doctorInfo.specialist"
                                class="text-sm text-gray-600"
                            >
                                {{ doctorInfo.specialist }}
                            </div>
                            <div
                                v-if="doctorInfo.department"
                                class="text-xs text-gray-500 mt-1"
                            >
                                {{ doctorInfo.department }}
                            </div>
                        </div>
                    </div>
                </div>
            </a-col>
        </a-row>

        <!-- Duration (event only) -->
        <a-row v-if="!isTask" :gutter="16">
            <a-col :span="readOnly ? 24 : 12">
                <a-form-item :label="$t('appointments.duration')" :required="!readOnly">
                    <span v-if="readOnly" class="text-sm text-gray-800">{{ formData.duration_display }} {{ formData.duration_unit }}</span>
                    <a-input-number
                        v-else
                        :value="formData.duration_display"
                        @change="(val) => updateForm('duration_display', val)"
                        :min="15"
                        :step="15"
                        style="width: 100%"
                    />
                </a-form-item>
            </a-col>
            <a-col v-if="!readOnly" :span="12">
                <a-form-item label="Unit" required>
                    <a-select
                        :value="formData.duration_unit"
                        @change="(val) => updateForm('duration_unit', val)"
                        class="w-full"
                        :getPopupContainer="
                            (triggerNode) => triggerNode.parentNode
                        "
                    >
                        <a-select-option value="minutes">{{
                            $t("common.minutes")
                        }}</a-select-option>
                        <a-select-option value="hours">{{
                            $t("common.hours")
                        }}</a-select-option>
                    </a-select>
                </a-form-item>
            </a-col>
        </a-row>

        <!-- Deadline (task only) -->
        <a-row v-if="isTask" :gutter="16">
            <a-col :span="12">
                <a-form-item :label="$t('common.deadline', 'Deadline')">
                    <span v-if="readOnly" class="text-sm text-gray-800">{{ formData.deadline || $t('common.none', 'None') }}</span>
                    <a-date-picker
                        v-else
                        :value="
                            formData.deadline ? dayjs(formData.deadline) : null
                        "
                        format="YYYY-MM-DD"
                        @change="
                            (date, dateString) =>
                                updateForm('deadline', dateString)
                        "
                        :disabled-date="disabledDeadlineDate"
                        class="w-full"
                    />
                </a-form-item>
            </a-col>
        </a-row>

        <a-row :gutter="16">
            <a-col v-if="!autoSelectDoctor" :xs="24" :sm="24" :md="12" :lg="12">
                <a-form-item :label="$t('common.user')" :required="!isTask && !readOnly">
                    <span v-if="readOnly" class="text-sm text-gray-800">{{ formData.doctor_name || '-' }}</span>
                    <UserSelect
                        v-else
                            @onChange="(id) => updateForm('user_id', id)"
                            :value="formData.user_id"
                    />
                </a-form-item>
            </a-col>
            <a-col
                :xs="24"
                :sm="24"
                :md="autoSelectDoctor ? 24 : 12"
                :lg="autoSelectDoctor ? 24 : 12"
            >
                <a-form-item :label="$t('common.patient')">
                    <span v-if="readOnly" class="text-sm text-gray-800">{{ formData.patient_name || '-' }}</span>
                    <UserSelect
                        v-else
                        @onChange="(id) => updateForm('patient_id', id)"
                        :value="formData.patient_id"
                        userType="patient"
                        :showDetailedInfo="true"
                    />
                </a-form-item>
            </a-col>
        </a-row>

        <a-form-item :label="$t('common.description')">
            <p v-if="readOnly" class="text-sm text-gray-800 m-0 wrap-break-word">{{ formData.description || '-' }}</p>
            <a-textarea
                v-else
                :value="formData.description"
                @input="(e) => updateForm('description', e.target.value)"
                auto-size
            />
        </a-form-item>

        <!-- Recurrence Update Scope (Only for existing series) -->
        <div
            v-if="formData.id && formData.series_id"
            class="mt-4 border-t border-gray-100 pt-4"
        >
            <p class="font-medium text-gray-800 mb-2">
                {{
                    $t(
                        "calendar.recurring_event_update_scope",
                        "This is a repeating event. Which occurrences should be updated?",
                    )
                }}
            </p>
            <a-radio-group
                :value="formData.update_mode || 'this'"
                @change="(e) => updateForm('update_mode', e.target.value)"
                class="flex flex-col gap-2 mt-2"
            >
                <a-radio value="this">
                    {{ $t("calendar.this_event", "This event") }}
                </a-radio>
                <a-radio value="following">
                    {{
                        $t(
                            "calendar.this_and_following",
                            "This and following events",
                        )
                    }}
                </a-radio>
                <a-radio value="all">
                    {{ $t("calendar.all_events", "All events in the series") }}
                </a-radio>
            </a-radio-group>
        </div>
    </a-form>
</template>

<script setup>
import {
    Form as AForm,
    FormItem as AFormItem,
    Row as ARow,
    Col as ACol,
    Input as AInput,
    Tag as ATag,
    Switch as ASwitch,
    Avatar as AAvatar,
    InputNumber as AInputNumber,
    Select as ASelect,
    DatePicker as ADatePicker,
    Radio as ARadio,
} from "ant-design-vue";
import { computed } from "vue";
import dayjs from "dayjs";
import { CalendarOutlined, ClockCircleOutlined, SyncOutlined } from "@ant-design/icons-vue";

const ASelectOption = ASelect.Option;
const ATextarea = AInput.TextArea;
const ARadioGroup = ARadio.Group;
import ColorInput from "@components/common/input/ColorInput.vue";
import UserSelect from "@components/common/select/UserSelect.vue";
import DateTimeRangePicker from "./DateTimeRangePicker.vue";
import RecurrenceSelect from "@components/common/calendarvue/RecurrenceSelect.vue";

const props = defineProps({
    formData: {
        type: Object,
        required: true,
    },
    formType: {
        type: String,
        default: "event",
        validator: (v) => ["event", "task"].includes(v),
    },
    readOnly: {
        type: Boolean,
        default: false,
    },
    autoSelectDoctor: {
        type: Boolean,
        default: false,
    },
    doctorInfo: {
        type: Object,
        default: () => ({}),
    },
});

const emit = defineEmits(["update:formData", "modalState"]);

const isTask = computed(() => props.formType === "task");

const computedEndDate = computed(() => {
    if (!props.formData.selectedDate_full || !props.formData.selectedTimeSlot)
        return null;
    if (isTask.value) {
        if (!props.formData.endTime) return props.formData.selectedDate_full;
        const start = dayjs(
            `${props.formData.selectedDate_full} ${props.formData.selectedTimeSlot}`,
        );
        const end = dayjs(
            `${props.formData.selectedDate_full} ${props.formData.endTime}`,
        );
        return end.isBefore(start)
            ? end.add(1, "day").format("YYYY-MM-DD")
            : end.format("YYYY-MM-DD");
    }
    const durationMins =
        props.formData.duration_unit === "hours"
            ? parseInt(props.formData.duration_display || 1) * 60
            : parseInt(props.formData.duration_display || 30);
    const start = dayjs(
        `${props.formData.selectedDate_full} ${props.formData.selectedTimeSlot}`,
    );
    return start.add(durationMins, "minute").format("YYYY-MM-DD");
});

const computedStartDateForRecurrence = computed(() => {
    return props.formData.selectedDate_full
        ? dayjs(props.formData.selectedDate_full).toDate()
        : new Date();
});

const updateForm = (key, value) => {
    const updates = { [key]: value };

    if (key === "duration_display" || key === "duration_unit") {
        const tempForm = { ...props.formData, ...updates };
        const durationMins =
            tempForm.duration_unit === "hours"
                ? parseInt(tempForm.duration_display || 1) * 60
                : parseInt(tempForm.duration_display || 30);

        if (tempForm.selectedTimeSlot) {
            const start = dayjs(`2000-01-01 ${tempForm.selectedTimeSlot}`);
            updates.endTime = start.add(durationMins, "minute").format("HH:mm");
        }
    }

    emit("update:formData", { ...props.formData, ...updates });
};

const getNextHalfHourTime = () => {
    const now = dayjs();
    const rounded = now
        .second(0)
        .millisecond(0)
        .minute(now.minute() < 30 ? 30 : 0)
        .add(now.minute() < 30 ? 0 : 1, "hour");

    return rounded.format("HH:mm");
};

const handleTaskAllDayChange = (checked) => {
    if (!isTask.value) {
        updateForm("is_all_day", checked);
        return;
    }

    const updates = { is_all_day: checked };

    if (!checked) {
        const startTime = getNextHalfHourTime();
        const endTime = dayjs(`2000-01-01 ${startTime}`)
            .add(30, "minute")
            .format("HH:mm");

        updates.selectedTimeSlot = startTime;
        updates.endTime = endTime;
    }

    emit("update:formData", { ...props.formData, ...updates });
};

const handleDateUpdate = (dateString) => {
    const d = dayjs(dateString);
    emit("update:formData", {
        ...props.formData,
        selectedDate_full: dateString,
        date: dateString,
        selectedDate: d.date(),
        currentMonth: d.month(),
        currentYear: d.year(),
    });
};

const handleStartTimeUpdate = (timeString) => {
    const updates = { selectedTimeSlot: timeString };

    if (isTask.value) {
        emit("update:formData", { ...props.formData, ...updates });
        return;
    }

    const durationMins =
        props.formData.duration_unit === "hours"
            ? parseInt(props.formData.duration_display || 1) * 60
            : parseInt(props.formData.duration_display || 30);

    const start = dayjs(`2000-01-01 ${timeString}`);
    updates.endTime = start.add(durationMins, "minute").format("HH:mm");

    emit("update:formData", { ...props.formData, ...updates });
};

const handleEndTimeUpdate = (timeString) => {
    const updates = { endTime: timeString };

    if (isTask.value) {
        emit("update:formData", { ...props.formData, ...updates });
        return;
    }

    const durationMins =
        props.formData.duration_unit === "hours"
            ? parseInt(props.formData.duration_display || 1) * 60
            : parseInt(props.formData.duration_display || 30);

    const end = dayjs(`2000-01-01 ${timeString}`);
    updates.selectedTimeSlot = end
        .subtract(durationMins, "minute")
        .format("HH:mm");

    emit("update:formData", { ...props.formData, ...updates });
};

// Task-specific deadline validators
const disabledDeadlineDate = (current) => {
    if (!props.formData.selectedDate_full) return false;
    return (
        current &&
        current.isBefore(dayjs(props.formData.selectedDate_full), "day")
    );
};
</script>
