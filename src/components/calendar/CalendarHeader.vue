<template>
    <div class="w-full">
        <div
            class="grid grid-cols-3 items-center p-4 bg-white border-b border-gray-100"
        >
            <div class="nav-left flex items-center gap-4">
                <a-button
                    v-if="resources.length > 1"
                    type="text"
                    @click="$emit('toggle-sidebar')"
                    class="text-gray-500 flex items-center gap-2"
                >
                    <template #icon>
                        <MenuFoldOutlined v-if="sidebarVisible" />
                        <MenuUnfoldOutlined v-else />
                    </template>
                    <span>
                        {{
                            selectedResources.length === resources.length && resources.length > 0
                                ? t("calendar.all_calendars")
                                : t("calendar.selected_calendars", { count: selectedResources.length })
                        }}
                    </span>
                </a-button>


            </div>

            <div class="nav-center flex items-center justify-center gap-4">
                <div class="flex items-center gap-3 text-base font-semibold text-gray-800">
                    <div class="relative flex items-center justify-center min-w-40">
                        <a-button
                            type="text"
                            class="text-center w-full cursor-pointer hover:text-blue-600 transition-colors"
                            @click="datePickerOpen = true"
                        >
                            {{ formattedDate || formattedCurrentDate }}
                        </a-button>
                        <a-date-picker
                            v-model:value="datePickerValue"
                            :open="datePickerOpen"
                            @openChange="(status) => (datePickerOpen = status)"
                            :allowClear="false"
                            class="absolute opacity-0 pointer-events-none -translate-x-54 translate-y-4"
                            style="width: 0; height: 0; padding: 0; border: none"
                            @change="handlePickerChange"
                        />
                    </div>
                    <a-button @click="$emit('previous-date')" type="text" shape="circle">
                        <template #icon>
                            <LeftOutlined style="font-size: 12px" />
                        </template>
                    </a-button>
                    <a-button @click="$emit('next-date')" type="text" shape="circle">
                        <template #icon>
                            <RightOutlined style="font-size: 12px" />
                        </template>
                    </a-button>
                </div>
                <a-button @click="$emit('go-today')" type="text">
                    {{ t("calendar.today") }}
                </a-button>
            </div>

            <div class="nav-right flex justify-end gap-2">
                <a-tooltip :title="t('common.settings')">
                    <a-dropdown
                        :trigger="['click']"
                        placement="bottomRight"
                        v-model:open="settingsOpen"
                        @openChange="onSettingsOpenChange"
                    >
                        <a-button type="text" shape="circle" class="ml-2">
                            <template #icon><SettingOutlined style="font-size: 14px" /></template>
                        </a-button>
                        <template #overlay>
                            <a-menu>
                                <a-menu-item key="toggle_weekends" @click.stop>
                                    <a-checkbox
                                        :checked="showWeekends"
                                        @change="onShowWeekendsChange"
                                    >
                                        {{ t("calendar.show_weekends") }}
                                    </a-checkbox>
                                </a-menu-item>
                                <a-menu-item key="toggle_completed_tasks" @click.stop>
                                    <a-checkbox
                                        :checked="showCompletedTasks"
                                        @change="onShowCompletedTasksChange"
                                    >
                                        {{ t("calendar.show_completed_tasks") }}
                                    </a-checkbox>
                                </a-menu-item>
                                <a-menu-item key="print_calendar" @click="onPrintCalendarClick">
                                    <div class="flex items-center justify-between w-full">
                                        <div class="flex items-center gap-2">
                                            <PrinterOutlined />
                                            {{ t("calendar.print_calendar") }}
                                        </div>
                                        <span
                                            class="text-gray-400 text-[10px] ml-6 border border-gray-200 bg-gray-50 rounded px-1.5 py-0.5 leading-none shadow-sm"
                                            >P</span
                                        >
                                    </div>
                                </a-menu-item>
                            </a-menu>
                        </template>
                    </a-dropdown>
                </a-tooltip>

                <a-tooltip :title="t('calendar.calendar_view')">
                    <a-dropdown :trigger="['click']" placement="bottomRight">
                        <a-button type="text" shape="circle">
                            <template #icon>
                                <ScheduleOutlined v-if="viewMode === 'day_single'" />
                                <CalendarOutlined v-else-if="viewMode === 'week'" />
                                <AppstoreOutlined v-else-if="viewMode === 'month'" />
                                <ProfileOutlined v-else />
                            </template>
                        </a-button>
                        <template #overlay>
                            <a-menu :selectedKeys="[viewMode]">
                                <a-menu-item key="day_single" @click="$emit('update:viewMode', 'day_single')">
                                    <div class="flex items-center justify-between w-full">
                                        <div class="flex items-center gap-2">
                                            <ScheduleOutlined />
                                            {{ t("calendar.day") }}
                                        </div>
                                        <span
                                            class="text-gray-400 text-[10px] ml-6 border border-gray-200 bg-gray-50 rounded px-1.5 py-0.5 leading-none shadow-sm"
                                            >D</span
                                        >
                                    </div>
                                </a-menu-item>
                                <a-menu-item key="week" @click="$emit('update:viewMode', 'week')">
                                    <div class="flex items-center justify-between w-full">
                                        <div class="flex items-center gap-2">
                                            <CalendarOutlined />
                                            {{ t("calendar.week") }}
                                        </div>
                                        <span
                                            class="text-gray-400 text-[10px] ml-6 border border-gray-200 bg-gray-50 rounded px-1.5 py-0.5 leading-none shadow-sm"
                                            >W</span
                                        >
                                    </div>
                                </a-menu-item>
                                <a-menu-item key="month" @click="$emit('update:viewMode', 'month')">
                                    <div class="flex items-center justify-between w-full">
                                        <div class="flex items-center gap-2">
                                            <AppstoreOutlined />
                                            {{ t("calendar.month") }}
                                        </div>
                                        <span
                                            class="text-gray-400 text-[10px] ml-6 border border-gray-200 bg-gray-50 rounded px-1.5 py-0.5 leading-none shadow-sm"
                                            >M</span
                                        >
                                    </div>
                                </a-menu-item>
                                <a-menu-item key="agenda" @click="$emit('update:viewMode', 'agenda')">
                                    <div class="flex items-center justify-between w-full">
                                        <div class="flex items-center gap-2">
                                            <ProfileOutlined />
                                            {{ t("calendar.agenda") }}
                                        </div>
                                        <span
                                            class="text-gray-400 text-[10px] ml-6 border border-gray-200 bg-gray-50 rounded px-1.5 py-0.5 leading-none shadow-sm"
                                            >A</span
                                        >
                                    </div>
                                </a-menu-item>
                            </a-menu>
                        </template>
                    </a-dropdown>
                </a-tooltip>

                <a-tooltip :title="t('common.add')">
                    <a-dropdown :trigger="['click']" placement="bottomRight">
                        <a-button type="text" shape="circle">
                            <template #icon><PlusOutlined style="font-size: 12px" /></template>
                        </a-button>
                        <template #overlay>
                            <a-menu>
                                <a-menu-item key="appointment" @click="$emit('add-reservation', 'appointment')">
                                    <template #icon><CalendarOutlined /></template>
                                    {{ t("appointments.new_appointment") }}
                                </a-menu-item>
                                <a-menu-item key="event" @click="$emit('add-reservation', 'event')">
                                    <template #icon><TeamOutlined /></template>
                                    {{ t("calendar.new_event") }}
                                </a-menu-item>
                                <a-menu-item key="task" @click="$emit('add-reservation', 'task')">
                                    <template #icon><CheckCircleOutlined /></template>
                                    {{ t("task") }}
                                </a-menu-item>
                            </a-menu>
                        </template>
                    </a-dropdown>
                </a-tooltip>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import {
    Button as AButton,
    DatePicker as ADatePicker,
    Tooltip as ATooltip,
    Dropdown as ADropdown,
    Menu as AMenu,
    MenuItem as AMenuItem,
    Checkbox as ACheckbox,
} from "ant-design-vue";
import moment from "moment";
import dayjs from "dayjs";
import {
    PlusOutlined,
    TeamOutlined,
    LeftOutlined,
    RightOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    CalendarOutlined,
    ProfileOutlined,
    AppstoreOutlined,
    SettingOutlined,
    PrinterOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    ScheduleOutlined,
} from "@ant-design/icons-vue";
import { useTranslation } from "../../composables/useTranslation";

const { t } = useTranslation();

const props = defineProps({
    currentDate: { type: Object, required: true },
    formattedDate: { type: String, default: "" },
    viewMode: { type: String, default: "day_single" },

    resources: { type: Array, default: () => [] },
    selectedResources: { type: Array, default: () => [] },
    sidebarVisible: { type: Boolean, default: true },
    showWeekends: { type: Boolean, default: true },
    showCompletedTasks: { type: Boolean, default: true },
});

const emit = defineEmits([
    "update:viewMode",
    "update:showWeekends",
    "update:showCompletedTasks",
    "add-reservation",
    "go-today",
    "previous-date",
    "next-date",
    "toggle-sidebar",
    "print-calendar",
    "select-date",
]);

const datePickerOpen = ref(false);
const datePickerValue = ref(dayjs(props.currentDate.toDate()));
const settingsOpen = ref(false);

const onSettingsOpenChange = (open) => {
    settingsOpen.value = open;
};

const keepSettingsOpen = () => {
    settingsOpen.value = true;
};

const onShowWeekendsChange = (event) => {
    emit("update:showWeekends", event.target.checked);
    keepSettingsOpen();
};

const onShowCompletedTasksChange = (event) => {
    emit("update:showCompletedTasks", event.target.checked);
    keepSettingsOpen();
};

const onPrintCalendarClick = () => {
    emit("print-calendar");
    keepSettingsOpen();
};

watch(
    () => props.currentDate,
    (newVal) => {
        if (newVal) {
            datePickerValue.value = dayjs(newVal.toDate());
        }
    },
    { immediate: true },
);

const handlePickerChange = (date) => {
    datePickerOpen.value = false;
    if (date) {
        const mDate = moment(date.toDate());
        emit("select-date", mDate);
    }
};

const formattedCurrentDate = computed(() =>
    props.currentDate?.format("ddd, DD MMM YYYY"),
);
</script>
