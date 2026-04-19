<template>
    <div class="relative border-t border-gray-200 bg-white">
        <div
            ref="scrollContainer"
            class="min-w-full overflow-x-scroll max-h-[calc(100vh-130px)] overflow-y-auto"
        >
            <div class="flex flex-col w-max min-w-full">
                <!-- Unified Sticky Header -->
                <div ref="stickyHeaderRef" class="sticky top-0 z-[100] flex flex-col w-max min-w-full">
                    <div class="flex w-max min-w-full">
                    <!-- Corner GMT Header (Sticky Top & Left) -->
                    <div
                        class="sticky left-0 z-[110] bg-white border-b-2 border-r border-gray-200 flex items-center justify-center text-[10px] text-gray-400 font-medium shadow-sm transition-all flex-shrink-0"
                        :class="
                            viewMode === 'week'
                                ? 'w-[60px] h-[40px]'
                                : 'w-[60px] h-[88px]'
                        "
                    >
                        <span>{{ timezoneOffset }}</span>
                    </div>

                    <!-- Column Headers (Sync with columns below) -->
                    <div
                        class="flex flex-1 items-stretch bg-white border-b-2 border-gray-200 shadow-sm"
                    >
                        <template v-if="viewMode === 'day'">
                            <div
                                v-for="dentist in dentists"
                                :key="`header-${dentist.xid}`"
                                class="min-w-[200px] flex-1 flex flex-col border-r border-gray-200 overflow-hidden"
                                :class="isDoctorOnHoliday(dentist.xid, currentDate.format('YYYY-MM-DD')) ? 'bg-red-50/40' : ''"
                            >
                                <!-- Status indicator bar -->
                                <div
                                    class="h-[3px] w-full flex-shrink-0"
                                    :class="isDoctorOnHoliday(dentist.xid, currentDate.format('YYYY-MM-DD')) ? 'bg-red-400' : 'bg-blue-400'"
                                />
                                <div class="p-3 flex justify-between items-start flex-1">
                                    <div class="flex gap-3">
                                        <a-avatar
                                            :src="dentist?.image"
                                            :alt="dentist?.name"
                                            :class="isDoctorOnHoliday(dentist.xid, currentDate.format('YYYY-MM-DD')) ? 'opacity-50' : ''"
                                        >
                                            {{ dentist?.name?.charAt(0) }}
                                        </a-avatar>
                                        <div
                                            class="dentist-details overflow-hidden"
                                        >
                                            <h4
                                                class="m-0 text-sm font-semibold text-gray-800 leading-tight truncate"
                                            >
                                                {{ dentist?.name }}
                                            </h4>
                                            <!-- Holiday status -->
                                            <div
                                                v-if="isDoctorOnHoliday(dentist.xid, currentDate.format('YYYY-MM-DD'))"
                                                class="mt-1.5"
                                            >
                                                <span class="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-500 border border-red-200 rounded-full px-1.5 py-px font-medium leading-tight">
                                                    <CalendarOutlined style="font-size: 8px" />
                                                    {{ $t('calendar.on_holiday', 'On Holiday') }}
                                                </span>
                                            </div>
                                            <!-- Normal: appointment count -->
                                            <p
                                                v-else
                                                class="mt-1 text-[11px] text-gray-400 flex flex-col whitespace-nowrap"
                                            >
                                                <span class="mb-0.5">
                                                    {{
                                                        $t(
                                                            "calendar.todays_appointment",
                                                        )
                                                    }}
                                                </span>
                                                <strong class="text-blue-500">
                                                    {{
                                                        getDentistAppointmentCount(
                                                            dentist?.xid,
                                                        )
                                                    }}
                                                    {{
                                                        $t("calendar.patient_count")
                                                    }}
                                                </strong>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>
                        <template v-if="viewMode === 'week'">
                            <div
                                v-for="day in weekDays"
                                :key="`header-${day.date}`"
                                class="min-w-[150px] flex-1 h-[40px] flex flex-col items-center justify-center border-r border-gray-200 gap-0"
                                :class="
                                    day.date ===
                                    currentDate.format('YYYY-MM-DD')
                                        ? 'bg-blue-50'
                                        : 'bg-white'
                                "
                            >
                                <span
                                    class="text-[10px] font-medium uppercase tracking-wide leading-none"
                                    :class="day.date === currentDate.format('YYYY-MM-DD') ? 'text-blue-500' : 'text-gray-400'"
                                >
                                    {{ day.momentObj.format('ddd') }}
                                </span>
                                <span
                                    class="text-base font-bold leading-tight"
                                    :class="day.date === currentDate.format('YYYY-MM-DD') ? 'text-blue-600' : 'text-gray-700'"
                                >
                                    {{ day.momentObj.format('D') }}
                                </span>
                            </div>
                        </template>
                    </div>
                    </div>
                    <!-- All-Day Tasks Row -->
                    <div
                        v-if="hasAllDayEvents"
                        class="flex w-max min-w-full border-b border-gray-200 bg-white"
                    >
                        <div class="sticky left-0 z-[110] w-[60px] flex-shrink-0 bg-gray-50 border-r border-gray-200 flex items-center justify-center text-[9px] text-gray-400 font-medium leading-none">
                            {{ $t('calendar.all_day', 'All day') }}
                        </div>
                        <div class="flex flex-1">
                            <template v-if="viewMode === 'week'">
                                <div
                                    v-for="day in weekDays"
                                    :key="`allday-${day.date}`"
                                    class="min-w-[150px] flex-1 border-r border-gray-200 p-1"
                                    :class="day.date === currentDate.format('YYYY-MM-DD') ? 'bg-blue-50/30' : 'bg-white'"
                                >
                                    <div v-if="appointmentSlots[`${day.date}-all-day`]?.length" class="flex flex-col gap-0.5">
                                        <CalendarReservationsAppointment
                                            v-for="apt in appointmentSlots[`${day.date}-all-day`]"
                                            :key="apt.id"
                                            :appointment="apt"
                                            :isCompact="true"
                                            :isAllDay="true"
                                            @click="$emit('appointment-click', apt)"
                                            @task-complete-change="$emit('task-complete-change', $event)"
                                        />
                                    </div>
                                </div>
                            </template>
                            <template v-if="viewMode === 'day'">
                                <div
                                    v-for="dentist in dentists"
                                    :key="`allday-${dentist.xid}`"
                                    class="min-w-[200px] flex-1 border-r border-gray-200 p-1 bg-white"
                                >
                                    <div v-if="appointmentSlots[`${dentist.xid}-all-day`]?.length" class="flex flex-col gap-1">
                                        <CalendarReservationsAppointment
                                            v-for="apt in appointmentSlots[`${dentist.xid}-all-day`]"
                                            :key="apt.id"
                                            :appointment="apt"
                                            :isCompact="true"
                                            :isAllDay="true"
                                            @click="$emit('appointment-click', apt)"
                                            @task-complete-change="$emit('task-complete-change', $event)"
                                        />
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>

                <!-- Content Row (Time Slots + Columns) -->
                <div class="flex relative w-max min-w-full">
                    <!-- Realtime Current Time Indicator -->
                    <div
                        v-if="isTodayVisible"
                        class="absolute left-0 right-0 z-[95] flex items-center pointer-events-none"
                        :style="{ top: currentTimeTopPosition + 'px' }"
                    >
                        <!-- Sidebar Label Background -->
                        <div
                            class="w-[60px] h-[30px] flex items-center justify-center bg-gray-50 flex-shrink-0 relative"
                        >
                            <!-- The black label box -->
                            <div
                                class="bg-gray-900 text-white text-[11px] font-bold px-1.5 py-0.5 rounded leading-none absolute z-10"
                            >
                                {{ formattedCurrentTime }}
                            </div>
                        </div>
                        <!-- The Horizontal Line -->
                        <div class="flex-auto h-[1px] bg-gray-900 relative">
                            <!-- Small dot at the start of the line, attached to the timeline -->
                            <div
                                class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3 bg-gray-900"
                            ></div>
                        </div>
                    </div>

                    <!-- Time Slots Sidebar (Sticky Left) -->
                    <div
                        class="w-[60px] sticky left-0 z-[90] bg-gray-50 flex-shrink-0 border-r border-gray-200"
                    >
                        <!-- Time Slots Vertical List -->
                        <div
                            v-for="(time, index) in timeSlots"
                            :key="time"
                            class="h-[30px] border-b border-gray-100 flex items-center justify-center text-[11px] text-gray-500 relative box-border"
                            :class="{
                                'bg-[#fffbe6]':
                                    viewMode === 'day' && isBreakTime(time),
                                'bg-white':
                                    viewMode === 'week' || !isBreakTime(time),
                            }"
                        >
                            <!-- Hour Label with negative margin to sit on line, except first one -->
                            <span
                                v-if="isHourly(time)"
                                class="relative px-[2px]"
                                :class="{
                                    'top-0 text-gray-800 font-medium':
                                        index === 0,
                                    '-top-[15px]': index !== 0,
                                }"
                            >
                                {{ time }}</span
                            >
                        </div>
                    </div>

                    <!-- Day/Dentist Columns -->
                    <div class="flex flex-1 items-stretch">
                        <template v-if="viewMode === 'day'">
                            <CalendarReservationsDayColumn
                                v-for="dentist in dentists"
                                :key="dentist.xid"
                                viewMode="day"
                                :dentist="dentist"
                                :timeSlots="timeSlots"
                                :currentDate="currentDate"
                                :appointmentSlots="appointmentSlots"
                                :appointments="appointments"
                                :doctorHolidays="doctorHolidays"
                                :isDoctorOnBreak="isDoctorOnBreak"
                                :isSlotUnavailable="isSlotUnavailable"
                                :isDoctorOnHoliday="isDoctorOnHoliday"
                                :isSlotOccupied="isSlotOccupied"
                                :isHourly="isHourly"
                                :draggedAppointmentId="draggedAppointmentId"
                                :resizingAppointmentId="resizingAppointmentId"
                                :isPopoverOpen="isPopoverOpen"
                                :isOutsideSchedule="isOutsideSchedule"
                                @toggle-menu="
                                    $emit('toggle-dentist-menu', $event)
                                "
                                @slot-click="
                                    (dId, time, event, dateStr) =>
                                        $emit(
                                            'slot-click',
                                            dId,
                                            time,
                                            event,
                                            dateStr,
                                        )
                                "
                                @appointment-click="
                                    (apt) => $emit('appointment-click', apt)
                                "
                                @appointment-move="
                                    (evt, dId, time, dateStr) =>
                                        $emit(
                                            'appointment-move',
                                            evt,
                                            dId,
                                            time,
                                            dateStr,
                                        )
                                "
                                @drag-start="$emit('drag-start', $event)"
                                @drag-end="$emit('drag-end')"
                                @drag-move="$emit('drag-move', $event)"
                                @resize-start="$emit('resize-start', $event)"
                                @resize-end="$emit('resize-end', $event)"
                                @task-complete-change="
                                    $emit('task-complete-change', $event)
                                "
                            />
                        </template>
                        <template v-if="viewMode === 'week'">
                            <CalendarReservationsDayColumn
                                v-for="day in weekDays"
                                :key="day.date"
                                viewMode="week"
                                :weekDay="day"
                                :dentist="dentists && dentists[0]"
                                :timeSlots="timeSlots"
                                :currentDate="currentDate"
                                :appointmentSlots="appointmentSlots"
                                :appointments="appointments"
                                :doctorHolidays="doctorHolidays"
                                :isDoctorOnBreak="isDoctorOnBreak"
                                :isSlotUnavailable="isSlotUnavailable"
                                :isDoctorOnHoliday="isDoctorOnHoliday"
                                :isSlotOccupied="isSlotOccupied"
                                :isHourly="isHourly"
                                :draggedAppointmentId="draggedAppointmentId"
                                :resizingAppointmentId="resizingAppointmentId"
                                :isPopoverOpen="isPopoverOpen"
                                :isOutsideSchedule="isOutsideSchedule"
                                @slot-click="
                                    (dId, time, event, dateStr) =>
                                        $emit(
                                            'slot-click',
                                            dId,
                                            time,
                                            event,
                                            dateStr,
                                        )
                                "
                                @appointment-click="
                                    (apt) => $emit('appointment-click', apt)
                                "
                                @appointment-move="
                                    (evt, dId, time, dateStr) =>
                                        $emit(
                                            'appointment-move',
                                            evt,
                                            dId,
                                            time,
                                            dateStr,
                                        )
                                "
                                @drag-start="$emit('drag-start', $event)"
                                @drag-end="$emit('drag-end')"
                                @drag-move="$emit('drag-move', $event)"
                                @resize-start="$emit('resize-start', $event)"
                                @resize-end="$emit('resize-end', $event)"
                                @task-complete-change="
                                    $emit('task-complete-change', $event)
                                "
                            />
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from "vue";
import moment from "moment";
import { CalendarOutlined } from "@ant-design/icons-vue";
import CalendarReservationsDayColumn from "./CalendarDayColumn.vue";
import CalendarReservationsAppointment from "./CalendarAppointment.vue";

const scrollContainer = ref(null);
const stickyHeaderRef = ref(null);

const props = defineProps({
    viewMode: { type: String, default: "day" },
    weekDays: { type: Array, default: () => [] },
    timeSlots: Array,
    dentists: Array,
    currentDate: Object,
    appointmentSlots: Object,
    appointments: Array,
    doctorHolidays: Array,
    timezoneOffset: String,
    draggedAppointmentId: { type: [String, Number], default: null },
    resizingAppointmentId: { type: [String, Number], default: null },
    isPopoverOpen: { type: Boolean, default: false },
    isOutsideSchedule: { type: Function, required: true },
    // Helpers
    isBreakTime: Function,
    isDoctorOnBreak: Function,
    isSlotUnavailable: Function,
    isDoctorOnHoliday: Function,
    isSlotOccupied: Function,
    isHourly: Function,
});

defineEmits([
    "toggle-dentist-menu",
    "slot-click",
    "appointment-click",
    "appointment-move",
    "drag-start",
    "drag-end",
    "drag-move",
    "resize-start",
    "resize-end",
    "task-complete-change",
]);

const getDentistAppointmentCount = (dentistId) => {
    let count = 0;
    Object.keys(props.appointmentSlots).forEach((key) => {
        if (key.startsWith(`${dentistId}-`)) {
            count += props.appointmentSlots[key].length;
        }
    });
    return count;
};

const hasAllDayEvents = computed(() => {
    return Object.keys(props.appointmentSlots || {}).some(
        (key) => key.endsWith("-all-day") && props.appointmentSlots[key]?.length > 0,
    );
});

const scrollToInitialPosition = () => {
    nextTick(() => {
        if (!scrollContainer.value) return;

        // Use actual sticky header height so the target slot is never hidden behind it
        const headerHeight = stickyHeaderRef.value?.offsetHeight ?? 80;
        const topPadding = headerHeight + 20;

        if (isTodayVisible.value) {
            const top = Math.max(0, currentTimeTopPosition.value - topPadding);
            scrollContainer.value.scrollTo({
                top: top,
                behavior: "smooth",
            });
            return;
        }

        const firstActiveIndex = props.timeSlots.findIndex(
            (t) => !props.isOutsideSchedule(t),
        );

        if (firstActiveIndex > -1) {
            // Subtract one extra slot + header height so the first active slot is
            // fully visible below the sticky header
            const slotsToSubtract = Math.ceil(headerHeight / 30) + 1;
            const offsetIndex = Math.max(0, firstActiveIndex - slotsToSubtract);
            scrollContainer.value.scrollTo({
                top: offsetIndex * 30,
                behavior: "smooth",
            });
        }
    });
};

// --- Realtime Indicator Logic ---
const currentTime = ref(moment());
let timeInterval = null;

const startRealtimeInterval = () => {
    // Update every minute, on the minute
    const msUntilNextMinute = (60 - moment().seconds()) * 1000;
    setTimeout(() => {
        currentTime.value = moment();
        timeInterval = setInterval(() => {
            currentTime.value = moment();
        }, 60000);
    }, msUntilNextMinute);
};

const isTodayVisible = computed(() => {
    const todayStr = moment().format("YYYY-MM-DD");
    if (props.viewMode === "day") {
        return props.currentDate.format("YYYY-MM-DD") === todayStr;
    } else {
        return props.weekDays.some((day) => day.date === todayStr);
    }
});

const formattedCurrentTime = computed(() => {
    return currentTime.value.format("h:mm");
});

const currentTimeTopPosition = computed(() => {
    // Top position corresponds exactly to where this minute falls in the slots
    // 1 hour = 4 slots = 120 pixels (since each slot is 30px high)
    // 1 minute = 120 / 60 = 2 pixels
    const hour = currentTime.value.hour();
    const minute = currentTime.value.minute();
    return hour * 120 + minute * 2;
});

watch([() => props.timeSlots, () => props.weekDays], scrollToInitialPosition);
// Re-scroll when the all-day row appears/disappears so its height is accounted for
watch(hasAllDayEvents, () => nextTick(scrollToInitialPosition));

onMounted(() => {
    scrollToInitialPosition();
    startRealtimeInterval();
});

onUnmounted(() => {
    if (timeInterval) clearInterval(timeInterval);
});
</script>
