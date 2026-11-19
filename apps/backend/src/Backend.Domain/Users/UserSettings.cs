namespace Backend.Domain.Users;

public enum Locale { Tr, En }

public enum ThemeSetting { System, Light, Dark, Night }

public enum VolumeUnit { Ml, Oz }

public enum WeightUnit { Kg, Lb }

public class UserSettings
{
    public string UserId { get; set; } = string.Empty;
    public Locale Locale { get; set; } = Locale.Tr;
    public ThemeSetting Theme { get; set; } = ThemeSetting.System;
    public VolumeUnit VolumeUnit { get; set; } = VolumeUnit.Ml;
    public WeightUnit WeightUnit { get; set; } = WeightUnit.Kg;
    public bool AutoNight { get; set; }
    public bool Haptics { get; set; } = true;
    public DateTimeOffset UpdatedAt { get; set; }
    public int Version { get; set; }
}
