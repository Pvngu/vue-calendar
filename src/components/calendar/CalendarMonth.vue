<template>
    <div
        class="calendar-month-view w-full h-full bg-white flex flex-col relative max-h-[calc(100vh-68px)] overflow-hidden"
    >
        <!-- Weekdays Header -->
        <div class="grid grid-cols-7 border-b border-gray-200 bg-white">
            <div
                v-for="(day, index) in weekDays"
                :key="index"
                class="py-2 text-center text-sm font-semibold text-gray-500 capitalize border-r border-gray-100 last:border-r-0"
            >
                {{ day }}
            </div>
        </div>

        <!-- Month Grid -->
        <div
            class="flex-1 overflow-y-auto grid grid-cols-7 auto-rows-fr bg-gray-100 gap-[1px]"
        >
            <div
                v-for="(dayObj, index) in calendarDays"
                :key="index"
                class="bg-white min-h-[120px] p-2 hover:bg-gray-50 transition-colors flex flex-col relative select-none"
                :class="{
                    'opacity-50': !dayObj.isCurrentMonth,
                    'bg-blue-50/30': dayObj.isToday,
                }"
                @click="onDayClick(dayObj.date, $event)"
            >
                <!-- Date Number -->
                <div class="flex items-center justify-between mb-1">
                    <span
                        class="text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full"
                        :class="dayObj.isToday ? 'bg-blue-600 text-white' : 'text-gray-700'"
                    >
                        {{ dayObj.date.format("D") }}
                        <span v-if="dayObj.date.format('D') === '1'" class="ml-1 text-xs">
                            {{ dayObj.date.format("MMMM") }}
                        </span>
                    </span>
                </div>

                <!-- Item list (max MAX_VISIBLE) -->
                <div class="flex-1 overflow-hidden pointer-events-none">
                    <div class="flex flex-col gap-[3px] mt-0.5 pointer-events-auto">
                        <template
                            v-for="(apt, aptIndex) in getAppointmentsForDay(dayObj.date)"
                            :key="apt.id || aptIndex"
                        >
                            <component
                                :is="apt.type === 'task' ? 'div' : 'div'"
                                v-if="aptIndex < MAX_VISIBLE"
                                v-bind="{
                                    role: 'button',
                                    tabindex: '0',
                                }"
                                :aria-label="getAriaLabel(apt)"
                                class="text-[11px] flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-85 leading-none truncate"
                                :class="itemClass(apt)"
                                :style="itemStyle(apt)"
                                @click.stop="$emit('appointment-click', apt)"
                                @keydown.enter.space.stop.prevent="$emit('appointment-click', apt)"
                            >
                                <!-- Appointment: calendar icon -->
                                <CalendarOutlined
                                    v-if="apt.type !== 'event' && apt.type !== 'task'"
                                    class="flex-shrink-0 text-[9px]"
                                    :style="{ color: apt.color || '#039be5' }"
                                    aria-hidden="true"
                                />
                                <!-- Event: tag dot -->
                                <span
                                    v-else-if="apt.type === 'event'"
                                    class="w-1.5 h-1.5 rounded-sm flex-shrink-0 mt-[1px]"
                                    :style="{ backgroundColor: apt.color || '#722ed1' }"
                                    aria-hidden="true"
                                />
                                <!-- Task: checkbox toggle -->
                                <button
                                    v-else
                                    class="flex-shrink-0 flex items-center justify-center w-3 h-3 focus:outline-none focus-visible:ring-1 focus-visible:ring-green-500 rounded-sm"
                                    :aria-label="apt.is_completed ? $t('calendar.mark_incomplete', 'Mark incomplete') : $t('calendar.mark_complete', 'Mark complete')"
                                    :aria-pressed="apt.is_completed"
                                    @click.stop="onTaskToggle(apt)"
                                    @keydown.enter.space.stop.prevent="onTaskToggle(apt)"
                                >
                                    <CheckCircleFilled
                                        v-if="apt.is_completed"
                                        class="text-green-500 text-[10px]"
                                        aria-hidden="true"
                                    />
                                    <CheckCircleOutlined
                                        v-else
                                        class="text-gray-400 text-[10px]"
                                        aria-hidden="true"
                                    />
                                </button>

                                <span
                                    class="truncate font-medium"
                                    :class="{
                                        'line-through opacity-50': apt.status === 'canceled' || (apt.type === 'task' && apt.is_completed),
                                        'text-gray-700': apt.type !== 'event',
                                    }"
                                    :style="apt.type === 'event' ? { color: apt.color || '#722ed1' } : {}"
                                >
                                    <span v-if="apt.type !== 'event' && apt.start_time" class="opacity-70 mr-0.5">{{ formatTime(apt.start_time) }}</span>
                                    {{ getAppointmentTitle(apt) }}
                                </span>
                            </component>
                        </template>

                        <!-- +N more popover trigger -->
                        <a-popover
                            v-if="getAppointmentsForDay(dayObj.date).length > MAX_VISIBLE"
                            :open="openPopoverDay === dayObj.date.format(DATE_FORMAT_DB)"
                            trigger="click"
                            placement="bottomLeft"
                            :overlay-inner-style="{ padding: 0 }"
                            @open-change="(vis) => onPopoverChange(vis, dayObj.date.format(DATE_FORMAT_DB))"
                        >
                            <template #content>
                                <div
                                    class="w-72"
                                    role="dialog"
                                    :aria-label="`${$t('calendar.all_events_for', 'All events for')} ${dayObj.date.format('D MMMM YYYY')}`"
                                >
                                    <!-- Popover header -->
                                    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                                        <div>
                                            <span class="text-sm font-semibold text-gray-800">
                                                {{ dayObj.date.format("ddd, D MMM") }}
                                            </span>
                                            <span class="ml-2 text-[10px] text-gray-400">
                                                {{ getAppointmentsForDay(dayObj.date).length }}
                                                {{ $t('calendar.items', 'items') }}
                                            </span>
                                        </div>
                                        <button
                                            class="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-xs leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                            :aria-label="$t('common.close', 'Close')"
                                            @click.stop="closePopover"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <!-- Scrollable list -->
                                    <ul class="max-h-64 overflow-y-auto py-1" role="list">
                                        <li
                                            v-for="apt in getAppointmentsForDay(dayObj.date)"
                                            :key="apt.id"
                                            class="flex items-start gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
                                            role="button"
                                            tabindex="0"
                                            :aria-label="getAriaLabel(apt)"
                                            @click.stop="onPopoverItemClick(apt)"
                                            @keydown.enter.space.stop.prevent="onPopoverItemClick(apt)"
                                        >
                                            <!-- Type indicator -->
                                            <div class="flex-shrink-0 mt-0.5">
                                                <!-- Appointment -->
                                                <div
                                                    v-if="apt.type !== 'event' && apt.type !== 'task'"
                                                    class="w-6 h-6 rounded flex items-center justify-center"
                                                    :style="{ backgroundColor: (apt.color || '#039be5') + '20' }"
                                                    aria-hidden="true"
                                                >
                                                    <CalendarOutlined
                                                        class="text-[11px]"
                                                        :style="{ color: apt.color || '#039be5' }"
                                                    />
                                                </div>
                                                <!-- Event -->
                                                <div
                                                    v-else-if="apt.type === 'event'"
                                                    class="w-6 h-6 rounded-full flex items-center justify-center"
                                                    :style="{ backgroundColor: (apt.color || '#722ed1') + '20' }"
                                                    aria-hidden="true"
                                                >
                                                    <TagOutlined
                                                        class="text-[11px]"
                                                        :style="{ color: apt.color || '#722ed1' }"
                                                    />
                                                </div>
                                                <!-- Task checkbox -->
                                                <button
                                                    v-else
                                                    class="w-6 h-6 flex items-center justify-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                                                    :aria-label="apt.is_completed ? $t('calendar.mark_incomplete', 'Mark incomplete') : $t('calendar.mark_complete', 'Mark complete')"
                                                    :aria-pressed="apt.is_completed"
                                                    @click.stop="onTaskToggle(apt)"
                                                    @keydown.enter.space.stop.prevent="onTaskToggle(apt)"
                                                >
                                                    <CheckCircleFilled v-if="apt.is_completed" class="text-green-500 text-base" aria-hidden="true" />
                                                    <CheckCircleOutlined v-else class="text-gray-300 text-base" aria-hidden="true" />
                                                </button>
                                            </div>

                                            <!-- Content -->
                                            <div class="flex-1 min-w-0">
                                                <div
                                                    class="text-xs font-medium truncate"
                                                    :class="{
                                                        'line-through opacity-50': apt.status === 'canceled' || (apt.type === 'task' && apt.is_completed),
                                                        'text-gray-800': apt.type !== 'event',
                                                    }"
                                                    :style="apt.type === 'event' ? { color: apt.color || '#722ed1' } : {}"
                                                >
                                                    {{ getAppointmentTitle(apt) }}
                                                </div>
                                                <div class="flex items-center gap-1.5 mt-0.5">
                                                    <span v-if="apt.start_time" class="text-[10px] text-gray-400">{{ formatTime(apt.start_time) }}</span>
                                                    <!-- Type badge -->
                                                    <span
                                                        class="text-[9px] px-1 py-px rounded-full leading-none font-medium"
                                                        :class="{
                                                            'bg-blue-50 text-blue-500': apt.type !== 'event' && apt.type !== 'task',
                                                            'bg-purple-50 text-purple-500': apt.type === 'event',
                                                            'bg-green-50 text-green-600': apt.type === 'task',
                                                        }"
                                                    >
                                                        {{ apt.type === 'task' ? $t('calendar.task', 'Task') : apt.type === 'event' ? $t('calendar.event', 'Event') : $t('calendar.appointment', 'Appt') }}
                                                    </span>
                                                </div>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </template>

                            <!-- Trigger badge -->
                            <div
                                class="text-[10px] text-blue-500 font-semibold px-1.5 py-0.5 rounded hover:bg-blue-50 cursor-pointer transition-colors mt-0.5 inline-flex items-center gap-0.5 select-none"
                                role="button"
                                tabindex="0"
                                :aria-label="`${$t('calendar.show_more', 'Show')} ${getAppointmentsForDay(dayObj.date).length - MAX_VISIBLE} ${$t('calendar.more', 'more')} ${$t('calendar.items', 'items')} ${$t('calendar.for_date', 'for')} ${dayObj.date.format('D MMMM YYYY')}`"
                                :aria-expanded="openPopoverDay === dayObj.date.format(DATE_FORMAT_DB)"
                                aria-haspopup="dialog"
                                @click.stop
                                @keydown.enter.space.stop.prevent
                            >
                                +{{ getAppointmentsForDay(dayObj.date).length - MAX_VISIBLE }}
                                {{ $t('calendar.more', 'more') }}
                            </div>
                        </a-popover>
                    </div>
                </div>
            </div>
        </div>
    </div>

</template>

<script setup>
import { Popover as APopover } from "ant-design-vue";
import { computed, ref } from "vue";
import moment from "moment";
import { useI18n } from "vue-i18n";
import {
    CalendarOutlined,
    TagOutlined,
    CheckCircleOutlined,
    CheckCircleFilled,
} from "@ant-design/icons-vue";

const props = defineProps({
    currentDate: { type: Object, required: true },
    appointments: { type: Array, default: () => [] },
    dentists: { type: Array, default: () => [] },
});

const emit = defineEmits([
    "appointment-click",
    "day-click",
    "change-view",
    "task-complete-change",
]);
const { t } = useI18n();

const MAX_VISIBLE = 2;
const DATE_FORMAT_DB = "YYYY-MM-DD";
const TIME_FORMAT_DISPLAY = "hh:mm A";

const openPopoverDay = ref(null);

const onPopoverChange = (visible, dateStr) => {
    openPopoverDay.value = visible ? dateStr : null;
};

const closePopover = () => {
    openPopoverDay.value = null;
};

const onPopoverItemClick = (apt) => {
    emit("appointment-click", apt);
};

const onTaskToggle = (apt) => {
    emit("task-complete-change", {
        appointment: apt,
        checked: !apt.is_completed,
    });
};

// ── Item styling helpers ──────────────────────────────────────────────────────

const itemClass = (apt) => {
    if (apt.type === "event") {
        return "px-1.5 py-0.5 rounded-full";
    }
    if (apt.type === "task") {
        return "px-1.5 py-0.5 rounded";
    }
    // appointment
    return "px-1.5 py-0.5 rounded border-l-[2px]";
};

const itemStyle = (apt) => {
    const color = apt.color || (apt.type === "event" ? "#722ed1" : apt.type === "task" ? "#52c41a" : "#039be5");
    if (apt.type === "event") {
        return { backgroundColor: color + "22" };
    }
    if (apt.type === "task") {
        const bg = apt.is_completed ? "#52c41a22" : color + "18";
        return { backgroundColor: bg };
    }
    // appointment — left colored border
    return { backgroundColor: color + "18", borderLeftColor: color };
};

const getAriaLabel = (apt) => {
    const title = getAppointmentTitle(apt);
    const time = apt.start_time ? formatTime(apt.start_time) : "";
    const type = apt.type === "task" ? t("calendar.task", "Task") : apt.type === "event" ? t("calendar.event", "Event") : t("calendar.appointment", "Appointment");
    const completed = apt.type === "task" && apt.is_completed ? `, ${t("calendar.completed", "completed")}` : "";
    return `${type}: ${title}${time ? `, ${time}` : ""}${completed}`;
};

// ── Calendar data ─────────────────────────────────────────────────────────────

const weekDays = computed(() => {
    const days = [];
    const startOfWeek = moment().startOf("isoWeek");
    for (let i = 0; i < 7; i++) {
        days.push(startOfWeek.clone().add(i, "days").format("ddd"));
    }
    return days;
});

const calendarDays = computed(() => {
    const startOfMonth = props.currentDate.clone().startOf("month");
    const startOfGrid = startOfMonth.clone().startOf("isoWeek");
    const endOfMonth = props.currentDate.clone().endOf("month");
    const endOfGrid = endOfMonth.clone().endOf("isoWeek");

    if (endOfGrid.diff(startOfGrid, "days") < 41) {
        endOfGrid.add(1, "week");
    }

    const days = [];
    let current = startOfGrid.clone();
    while (current.isBefore(endOfGrid) || current.isSame(endOfGrid, "day")) {
        days.push({
            date: current.clone(),
            isCurrentMonth: current.month() === props.currentDate.month(),
            isToday: current.isSame(moment(), "day"),
        });
        current.add(1, "day");
    }
    return days;
});

const getAppointmentsForDay = (dateObj) => {
    const dateStr = dateObj.format(DATE_FORMAT_DB);
    return props.appointments
        .filter((apt) => apt.appointment_date === dateStr)
        .sort((a, b) => {
            const timeA = moment(a.start_time, TIME_FORMAT_DISPLAY);
            const timeB = moment(b.start_time, TIME_FORMAT_DISPLAY);
            return timeA.isBefore(timeB) ? -1 : timeA.isAfter(timeB) ? 1 : 0;
        });
};

const formatTime = (timeStr) => {
    if (!timeStr) return "";
    return moment(timeStr, TIME_FORMAT_DISPLAY).format("h:mm A");
};

const getAppointmentTitle = (apt) => {
    if (apt.type === "event") return apt.title || t("calendar.new_event");
    if (apt.type === "task") return apt.title || t("calendar.new_task");
    return apt.patient_name || apt.patient?.name || t("appointments.new_appointment");
};

const onDayClick = (date, event) => {
    emit("day-click", date, event);
};
</script>
